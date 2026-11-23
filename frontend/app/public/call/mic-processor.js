// Open-mic capture for calls (ADR-0016): posts 20 ms mono frames to the page; the audio itself is never stored.
class OracleMicProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.size = Math.round(sampleRate / 50)
    this.frame = new Float32Array(this.size)
    this.at = 0
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0]
    if (channel) {
      for (let index = 0; index < channel.length; index += 1) {
        this.frame[this.at++] = channel[index]
        if (this.at === this.size) {
          this.port.postMessage(this.frame, [this.frame.buffer])
          this.frame = new Float32Array(this.size)
          this.at = 0
        }
      }
    }
    return true
  }
}

registerProcessor("oracle-mic", OracleMicProcessor)
