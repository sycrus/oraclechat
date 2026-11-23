/** Three.js + three-vrm renderer for a call. It only executes motion; the call state machine decides. */
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm"
import {
  VRMAnimationLoaderPlugin, VRMLookAtQuaternionProxy, createVRMAnimationClip, type VRMAnimation,
} from "@pixiv/three-vrm-animation"
import { blinkWeight, breathing, nextBlinkDelay } from "../../lib/call/idle"
import { mouthOpen, rms } from "../../lib/call/mouth"
import { VISEMES, visemeWeights, type Viseme } from "../../lib/call/visemes"
import { ARM_DOWN, FACE_DOWN, FACING_LIMIT, easeToward, facingCorrection, orientFor, thinkingPose, type Angles } from "../../lib/call/pose"
import { frameHead, isHeadVertex, shiftHead, type HeadBounds } from "../../lib/call/framing"
import { clipFor, nextTalk, type Clip } from "../../lib/call/clips"
import type { Body, Expression } from "../../lib/call/state"
import { BLOCK_PX, createPixelOutput } from "./pixel-filter"

/** wLipSync's output: smoothed vowel weights and a 0..1 volume. */
export interface LipSyncReading { readonly weights: Record<string, number>; readonly volume: number }

export interface VrmStage {
  /** The audio currently playing (null when silent); with a vowel analyser the mouth takes vowel shapes, otherwise it follows loudness. */
  setAudio(audio: { analyser: AnalyserNode | null; lipSync: LipSyncReading | null }): void
  /** What the call state machine says to show. */
  setState(state: { body: Body; expression: Expression }): void
  dispose(): void
}

const FACES = ["happy", "relaxed", "surprised", "sad"] as const
const FACE_WEIGHT = 0.7
/** Body animation clips (VRM Animation), shared by all tellers and gitignored; any that are missing are skipped. */
const IDLE_CLIP = "idle.vrma"
const TALK_CLIPS = ["talk-1.vrma", "talk-2.vrma", "talk-3.vrma"]
const CROSSFADE_S = 0.4

/** The head in the rest pose: vertices that move with the head bone (or sit under it), above the bone. Null if none. */
function measureHead(root: THREE.Object3D, headNode: THREE.Object3D, base: number): HeadBounds | null {
  root.updateMatrixWorld(true)
  const underHead = (node: THREE.Object3D | null) => { for (let n = node; n; n = n.parent) if (n === headNode) return true; return false }
  let top = -Infinity, minX = Infinity, maxX = -Infinity, sumZ = 0, count = 0
  const vertex = new THREE.Vector3(), bones = [0, 0, 0, 0], weights = [0, 0, 0, 0]
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return
    const { position, skinIndex, skinWeight } = node.geometry.attributes
    const headBones = node instanceof THREE.SkinnedMesh && skinIndex && skinWeight
      ? new Set(node.skeleton.bones.flatMap((bone, i) => (underHead(bone) ? [i] : [])))
      : null
    if (!headBones && !underHead(node)) return
    for (let i = 0; i < position.count; i++) {
      if (headBones) {
        for (let k = 0; k < 4; k++) { bones[k] = skinIndex.getComponent(i, k); weights[k] = skinWeight.getComponent(i, k) }
        if (!isHeadVertex(bones, weights, headBones)) continue
      }
      vertex.fromBufferAttribute(position, i).applyMatrix4(node.matrixWorld)
      if (vertex.y < base) continue
      top = Math.max(top, vertex.y); minX = Math.min(minX, vertex.x); maxX = Math.max(maxX, vertex.x)
      sumZ += vertex.z; count++
    }
  })
  return count ? { top, base, width: maxX - minX, centerZ: sumZ / count } : null
}

export async function createVrmStage(canvas: HTMLCanvasElement, modelUrl: string, animationsUrl = "/animations/"): Promise<VrmStage> {
  // ADR-0019: the teller renders low-res on a hidden canvas and is palette-snapped onto this one; without a 2D
  // context the plain render goes straight to this canvas.
  const pixels = createPixelOutput(canvas)
  const renderer = new THREE.WebGLRenderer({ canvas: pixels?.source ?? canvas, antialias: !pixels, alpha: true })
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  scene.add(new THREE.AmbientLight(0xffffff, 0.8))
  const key = new THREE.DirectionalLight(0xffffff, 1.6)
  key.position.set(0.6, 1.5, 1.5)
  scene.add(key)
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 20)

  const loader = new GLTFLoader()
  loader.register((parser) => new VRMLoaderPlugin(parser))
  loader.register((parser) => new VRMAnimationLoaderPlugin(parser))
  const gltf = await loader.loadAsync(modelUrl)
  const vrm = gltf.userData.vrm as VRM | undefined
  if (!vrm) { renderer.dispose(); throw new Error("Not a VRM model") }
  VRMUtils.removeUnnecessaryVertices(gltf.scene)
  VRMUtils.combineSkeletons(gltf.scene)
  VRMUtils.rotateVRM0(vrm) // VRM 0.x faces -Z; VRM 1.0 is unchanged
  scene.add(vrm.scene)

  const bone = (name: Parameters<NonNullable<VRM["humanoid"]>["getNormalizedBoneNode"]>[0]) => vrm.humanoid?.getNormalizedBoneNode(name) ?? null
  const leftArm = bone("leftUpperArm"), chest = bone("chest") ?? bone("spine"), neck = bone("neck")
  const rightArm = bone("rightUpperArm"), rightForearm = bone("rightLowerArm"), rightHand = bone("rightHand"), headBone = bone("head")
  const vrm0 = vrm.meta?.metaVersion === "0"
  const setAngles = (node: THREE.Object3D | null, angles: Angles) => {
    const { x, y, z } = orientFor(angles, vrm0)
    node?.rotation.set(x, y, z)
  }
  // Body clips: an idle loop and talking loops. Without the idle clip, the procedural pose below is used instead.
  const loadClip = async (file: string): Promise<THREE.AnimationClip | null> => {
    try {
      const animation = ((await loader.loadAsync(animationsUrl + file)).userData.vrmAnimations as VRMAnimation[] | undefined)?.[0]
      if (!animation) throw new Error("no VRM animation in file")
      return createVRMAnimationClip(animation, vrm)
    } catch (error) {
      console.warn(`[call] body animation unavailable: ${file}`, error)
      return null
    }
  }
  if (vrm.lookAt) {
    const proxy = new VRMLookAtQuaternionProxy(vrm.lookAt)
    proxy.name = "VRMLookAtQuaternionProxy"
    vrm.scene.add(proxy)
  }
  const [idleClip, ...talkClips] = await Promise.all([IDLE_CLIP, ...TALK_CLIPS].map(loadClip))
  const mixer = new THREE.AnimationMixer(vrm.scene)
  const idleAction = idleClip ? mixer.clipAction(idleClip) : null
  const talkActions = talkClips.flatMap((clip) => (clip ? [mixer.clipAction(clip)] : []))
  if (!idleAction) {
    setAngles(leftArm, { x: 0, y: 0, z: -ARM_DOWN })
    setAngles(rightArm, { x: 0, y: 0, z: ARM_DOWN })
  }

  // Head-and-shoulders framing, like a video call, measured from the model's head in the rest pose.
  vrm.update(0)
  // The head's forward direction in its own frame, taken from the rest pose, which faces the camera (+Z).
  const headForward = new THREE.Vector3(0, 0, 1)
  if (headBone) headForward.applyQuaternion(headBone.getWorldQuaternion(new THREE.Quaternion()).invert())
  const headWorld = new THREE.Quaternion(), parentWorld = new THREE.Quaternion(), turn = new THREE.Quaternion(), tilt = new THREE.Quaternion()
  const forward = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), right = new THREE.Vector3(1, 0, 0)
  /** Turns the head about world Y so its face stays near the camera, whatever the clip did to the body under it, and tilts it slightly down (about world X; positive turns +Z toward −Y). */
  const faceCamera = (head: THREE.Object3D, weight: number) => {
    forward.copy(headForward).applyQuaternion(head.getWorldQuaternion(headWorld))
    turn.setFromAxisAngle(up, facingCorrection(Math.atan2(forward.x, forward.z), FACING_LIMIT) * weight)
    turn.premultiply(tilt.setFromAxisAngle(right, FACE_DOWN * weight))
    if (head.parent) head.parent.getWorldQuaternion(parentWorld)
    else parentWorld.identity()
    // New world = turn · world, so local' = parent⁻¹ · turn · parent · local.
    head.quaternion.premultiply(turn.premultiply(parentWorld.clone().invert()).multiply(parentWorld))
  }
  const headNode = vrm.humanoid?.getRawBoneNode("head") ?? null
  const head = new THREE.Vector3()
  ;(headNode ?? vrm.scene).getWorldPosition(head)
  let headBounds = headNode ? measureHead(vrm.scene, headNode, head.y) : null
  if (idleAction && headNode) {
    // Allow for where the idle clip puts the head.
    idleAction.play()
    mixer.update(0)
    vrm.update(0)
    const posed = headNode.getWorldPosition(new THREE.Vector3())
    if (headBounds) headBounds = shiftHead(headBounds, posed.y - head.y, posed.z - head.z)
    head.copy(posed)
  }
  const placeCamera = () => {
    const framing = headBounds && frameHead(headBounds, camera.fov, camera.aspect)
    if (framing) {
      camera.position.set(0, framing.y, framing.centerZ + framing.distance)
      camera.lookAt(0, framing.y, framing.centerZ)
    } else {
      camera.position.set(0, head.y + 0.02, 1.6)
      camera.lookAt(0, head.y - 0.1, 0)
    }
  }
  placeCamera()

  const resize = () => {
    const { clientWidth: width, clientHeight: height } = canvas
    if (!width || !height) return
    if (pixels) {
      const low = { width: Math.max(1, Math.round(width / BLOCK_PX)), height: Math.max(1, Math.round(height / BLOCK_PX)) }
      renderer.setPixelRatio(1)
      renderer.setSize(low.width, low.height, false)
      pixels.setSize(low.width, low.height)
    } else {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(width, height, false)
    }
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    placeCamera()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  let analyser: AnalyserNode | null = null
  let samples = new Float32Array(1024)
  let lipSync: LipSyncReading | null = null
  const shapes: Record<Viseme, number> = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 }
  let nextBlink = performance.now() + nextBlinkDelay()
  let blinkStart = -Infinity
  let thinkingTarget = 0, thinking = 0
  let body: Body = "idle"
  let lastSpeaking = -Infinity
  let clip: Clip = "idle"
  let activeAction = idleAction
  let talkIndex = -1
  const thinkingBones = [rightArm, rightForearm, rightHand, headBone] as const
  const fullThinking = thinkingPose(1)
  const thinkingTargets = [fullThinking.rightUpperArm, fullThinking.rightLowerArm, fullThinking.rightHand, fullThinking.head]
    .map((angles) => { const { x, y, z } = orientFor(angles, vrm0); return new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)) })
  let face: Expression = "neutral"
  const faceWeights: Record<(typeof FACES)[number], number> = { happy: 0, relaxed: 0, surprised: 0, sad: 0 }
  const clock = new THREE.Clock()
  let frame = 0

  const tick = () => {
    frame = requestAnimationFrame(tick)
    const dt = clock.getDelta()
    const now = performance.now()
    thinking = easeToward(thinking, thinkingTarget, dt)
    const pose = thinkingPose(thinking)

    if (idleAction) {
      // Body clips: idle, or talking while speaking and briefly after; crossfaded.
      if (body === "speaking") lastSpeaking = now
      const wanted = clipFor(body, now - lastSpeaking, talkActions.length > 0)
      if (wanted !== clip) {
        clip = wanted
        let next = idleAction
        if (wanted === "talk") { talkIndex = nextTalk(talkActions.length, talkIndex); next = talkActions[talkIndex] ?? idleAction }
        next.reset().play()
        activeAction?.crossFadeTo(next, CROSSFADE_S, false)
        activeAction = next
      }
      mixer.update(dt)
      // Thinking: hand to chin and head turned, blended over the clip.
      thinkingBones.forEach((node, i) => { const target = thinkingTargets[i]; if (node && target) node.quaternion.slerp(target, thinking) })
      // Keep the face to the camera through talking gestures; thinking still looks away.
      if (headBone) faceCamera(headBone, 1 - thinking)
    } else {
      // Procedural fallback: breathing sway, lowered arms, and the thinking pose eased in and out.
      const { chest: chestSway, neck: neckSway } = breathing(clock.elapsedTime)
      setAngles(chest, { x: chestSway, y: 0, z: 0 })
      setAngles(neck, { x: neckSway * 0.5, y: neckSway, z: 0 })
      setAngles(rightArm, pose.rightUpperArm)
      setAngles(rightForearm, pose.rightLowerArm)
      setAngles(rightHand, pose.rightHand)
      setAngles(headBone, pose.head)
    }
    // Eyes up and away while thinking.
    if (vrm.lookAt) { vrm.lookAt.pitch = -pose.lookUp * 30; /* negative pitch looks up */ vrm.lookAt.yaw = pose.lookAway * 40 }

    for (const name of FACES) {
      faceWeights[name] = easeToward(faceWeights[name], face === name ? FACE_WEIGHT : 0, dt)
      vrm.expressionManager?.setValue(name, faceWeights[name])
    }

    if (now >= nextBlink) { blinkStart = now; nextBlink = now + nextBlinkDelay() }
    vrm.expressionManager?.setValue("blink", blinkWeight(now - blinkStart))

    let level = 0
    if (analyser) {
      if (samples.length !== analyser.fftSize) samples = new Float32Array(analyser.fftSize)
      analyser.getFloatTimeDomainData(samples)
      level = rms(samples)
    }
    if (lipSync) Object.assign(shapes, visemeWeights(lipSync.weights, lipSync.volume))
    else for (const name of VISEMES) shapes[name] = name === "aa" ? mouthOpen(level, shapes.aa) : easeToward(shapes[name], 0, dt)
    for (const name of VISEMES) vrm.expressionManager?.setValue(name, shapes[name])

    vrm.update(dt)
    renderer.render(scene, camera)
    pixels?.present(renderer.getContext())
  }
  tick()

  return {
    setAudio(next) { analyser = next.analyser; lipSync = next.lipSync },
    setState(next) { body = next.body; thinkingTarget = next.body === "thinking" ? 1 : 0; face = next.expression },
    dispose() {
      cancelAnimationFrame(frame)
      mixer.stopAllAction()
      observer.disconnect()
      VRMUtils.deepDispose(vrm.scene)
      renderer.dispose()
    },
  }
}
