// Duonn Atrium 20 network protocol (binary frames over WebSocket, port 8088).
// Frame: 0x80 LEN CMD payload CRC16-modbus(big-endian), LEN = payload length + 3.

export const CMD_SET = 0x03
export const CMD_READ = 0x06
export const CMD_CHANGED = 0x25
export const CMD_RENAME = 0x2f

export const INPUTS = 16
export const AUXES = 8
export const DCAS = 4
export const BANDS = 4

const INPUT_MUTE_BASE = 0x004a
const INPUT_STEP = 0x3e
const AUX_MUTE_BASE = 0x068e
const AUX_STEP = 0x6d
const MAIN_MUTE = { L: 0x09f6, R: 0x0a63 }
const DCA_FADER_BASE = 0x0bcc
const DCA_STEP = 0x09

// Offsets from an input's mute id
const OFF_FADER = 2
const OFF_GAIN = -2
const OFF_EQ = 0x1a
const OFF_HPF = 0x1d
const OFF_LPF = 0x1f
const OFF_BAND = 0x21 // band 1 freq; each band = freq, gain, Q, type

// Bit 15 on a filter or band frequency switches it off
export const OFF_FLAG = 0x8000

export type MuteTarget = `CH${number}` | `AUX${number}` | 'L' | 'R'
export type FaderTarget = `CH${number}` | `AUX${number}`

export const ids = {
	mute(target: MuteTarget): number {
		if (target === 'L' || target === 'R') return MAIN_MUTE[target]
		const aux = /^AUX(\d+)$/.exec(target)
		if (aux) return AUX_MUTE_BASE + (Number(aux[1]) - 1) * AUX_STEP
		return INPUT_MUTE_BASE + (Number(target.slice(2)) - 1) * INPUT_STEP
	},
	fader(target: FaderTarget): number {
		return target.startsWith('AUX') ? ids.mute(target) - 2 : ids.mute(target) + OFF_FADER
	},
	gain: (ch: number): number => ids.mute(`CH${ch}`) + OFF_GAIN,
	eq: (ch: number): number => ids.mute(`CH${ch}`) + OFF_EQ,
	hpf: (ch: number): number => ids.mute(`CH${ch}`) + OFF_HPF,
	lpf: (ch: number): number => ids.mute(`CH${ch}`) + OFF_LPF,
	bandFreq: (ch: number, band: number): number => ids.mute(`CH${ch}`) + OFF_BAND + (band - 1) * 4,
	bandGain: (ch: number, band: number): number => ids.bandFreq(ch, band) + 1,
	bandQ: (ch: number, band: number): number => ids.bandFreq(ch, band) + 2,
	dcaFader: (n: number): number => DCA_FADER_BASE + (n - 1) * DCA_STEP,
	dcaOn: (n: number): number => ids.dcaFader(n) - 1,
}

// Value scales
export const scale = {
	faderToRaw: (dB: number): number => clamp(Math.round(dB * 10 + 1200), 0, 1300),
	faderFromRaw: (raw: number): number => (raw === 0 ? -Infinity : (raw - 1200) / 10),
	bandGainToRaw: (dB: number): number => clamp(Math.round(500 + dB * 10), 0, 1000),
	bandGainFromRaw: (raw: number): number => (raw - 500) / 10,
	qToRaw: (q: number): number => clamp(Math.round(q * 100), 1, 0x7fff),
	qFromRaw: (raw: number): number => raw / 100,
	hzToRaw: (hz: number): number => clamp(Math.round(hz), 20, 20000),
}

export function clamp(v: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, v))
}

export function crc16Modbus(buf: Uint8Array): number {
	let crc = 0xffff
	for (const b of buf) {
		crc ^= b
		for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1
	}
	return crc
}

export function frame(cmd: number, payload: Buffer): Buffer {
	const body = Buffer.concat([Buffer.from([0x80, payload.length + 3, cmd]), payload])
	const crc = crc16Modbus(body)
	return Buffer.concat([body, Buffer.from([crc >> 8, crc & 0xff])])
}

export function setFrame(id: number, value: number): Buffer {
	const p = Buffer.alloc(4)
	p.writeUInt16BE(id, 0)
	p.writeUInt16BE(value & 0xffff, 2)
	return frame(CMD_SET, p)
}

export function readFrame(idList: number[]): Buffer {
	const p = Buffer.alloc(idList.length * 2)
	idList.forEach((id, i) => p.writeUInt16BE(id, i * 2))
	return frame(CMD_READ, p)
}

export function renameFrame(ch: number, name: string): Buffer {
	const text = Buffer.from(name.replace(/[^\x20-\x7e]/g, '').slice(0, 16), 'ascii')
	return frame(CMD_RENAME, Buffer.concat([Buffer.from([ch - 1]), text]))
}

export interface ParsedFrame {
	cmd: number
	values: Array<[id: number, value: number]>
}

// A message may carry several frames back to back; frames with a bad CRC are dropped.
export function parseFrames(buf: Buffer): ParsedFrame[] {
	const out: ParsedFrame[] = []
	let i = 0
	while (i + 5 <= buf.length && buf[i] === 0x80) {
		const total = buf[i + 1] + 2
		if (i + total > buf.length) break
		const f = buf.subarray(i, i + total)
		i += total
		if (crc16Modbus(f.subarray(0, total - 2)) !== f.readUInt16BE(total - 2)) continue
		const cmd = f[2]
		const values: Array<[number, number]> = []
		if (cmd === CMD_SET || cmd === CMD_READ || cmd === CMD_CHANGED) {
			for (let k = 3; k + 4 <= total - 2; k += 4) values.push([f.readUInt16BE(k), f.readUInt16BE(k + 2)])
		}
		out.push({ cmd, values })
	}
	return out
}

// Every id the module keeps in sync, in the order they are polled
export function allIds(): number[] {
	const list: number[] = []
	for (let ch = 1; ch <= INPUTS; ch++) {
		list.push(ids.mute(`CH${ch}`), ids.fader(`CH${ch}`), ids.gain(ch), ids.eq(ch), ids.hpf(ch), ids.lpf(ch))
		for (let b = 1; b <= BANDS; b++) list.push(ids.bandFreq(ch, b), ids.bandGain(ch, b), ids.bandQ(ch, b))
	}
	for (let a = 1; a <= AUXES; a++) list.push(ids.mute(`AUX${a}`), ids.fader(`AUX${a}`))
	list.push(ids.mute('L'), ids.mute('R'))
	for (let d = 1; d <= DCAS; d++) list.push(ids.dcaOn(d), ids.dcaFader(d))
	return list
}
