import { describe, expect, it } from "vitest"
import { dayLabel, dayPills, runStarts, showsName, tickState } from "./thread"

const user = (id: string) => ({ id, senderType: "user" as const, senderId: "local-user" })
const teller = (id: string, senderId = "mira-the-mystic") => ({ id, senderType: "teller" as const, senderId })

describe("runStarts", () => {
  it("marks the first message of each run from one sender", () => {
    const messages = [user("1"), user("2"), teller("3"), teller("4"), teller("5", "sage-the-seer"), user("6")]
    expect(runStarts(messages)).toEqual([true, false, true, false, true, true])
  })
})

describe("showsName", () => {
  it("names a teller at the start of a run in a group", () => expect(showsName({ group: true, runStart: true, senderType: "teller" })).toBe(true))
  it("never names in a one-to-one chat", () => expect(showsName({ group: false, runStart: true, senderType: "teller" })).toBe(false))
  it("never names your own messages", () => expect(showsName({ group: true, runStart: true, senderType: "user" })).toBe(false))
  it("names only the run start", () => expect(showsName({ group: true, runStart: false, senderType: "teller" })).toBe(false))
})

describe("tickState", () => {
  it("is sent while no teller has replied after it", () => {
    expect(tickState([teller("0"), user("1")], 1)).toBe("sent")
  })
  it("is answered once a teller message follows", () => {
    expect(tickState([user("1"), user("2"), teller("3")], 0)).toBe("answered")
  })
  it("is absent on teller messages", () => {
    expect(tickState([teller("1")], 0)).toBeNull()
  })
})

describe("day pills", () => {
  const now = new Date(2026, 10, 23, 22, 0) // Monday 23 November 2026
  const on = (y: number, m: number, d: number, h = 10) => new Date(y, m, d, h).toISOString()
  it("labels days as Today, Yesterday, a weekday within the week, or the date", () => {
    expect(dayLabel(on(2026, 10, 23), now)).toBe("Today")
    expect(dayLabel(on(2026, 10, 22), now)).toBe("Yesterday")
    expect(dayLabel(on(2026, 10, 19), now)).toBe("Thursday")
    expect(dayLabel(on(2026, 9, 18), now)).toBe("18 Oct 2026")
  })

  it("puts a pill above the first message of each day only", () => {
    const messages = [
      { createdAt: on(2026, 9, 18, 9) }, { createdAt: on(2026, 9, 18, 21) },
      { createdAt: on(2026, 10, 22, 8) }, { createdAt: on(2026, 10, 23, 7) }, {},
    ]
    expect(dayPills(messages, now)).toEqual(["18 Oct 2026", null, "Yesterday", "Today", null])
  })
})
