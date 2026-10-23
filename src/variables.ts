import type ModuleInstance from './main.js'
import { AUXES, BANDS, DCAS, INPUTS, OFF_FLAG, ids, scale } from './protocol.js'

export type VariablesSchema = Record<string, string | number | boolean | undefined>

const dB = (v: number): string => (v === -Infinity ? '-inf' : v.toFixed(1))

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	const defs: Record<string, { name: string }> = {}
	for (let ch = 1; ch <= INPUTS; ch++) {
		defs[`ch${ch}_mute`] = { name: `CH${ch} muted` }
		defs[`ch${ch}_fader`] = { name: `CH${ch} fader (dB)` }
		defs[`ch${ch}_gain`] = { name: `CH${ch} input gain (dB)` }
		defs[`ch${ch}_eq`] = { name: `CH${ch} EQ on` }
		defs[`ch${ch}_hpf`] = { name: `CH${ch} high-pass (Hz, or off)` }
		defs[`ch${ch}_lpf`] = { name: `CH${ch} low-pass (Hz)` }
		for (let b = 1; b <= BANDS; b++) {
			defs[`ch${ch}_band${b}_freq`] = { name: `CH${ch} EQ band ${b} frequency (Hz)` }
			defs[`ch${ch}_band${b}_gain`] = { name: `CH${ch} EQ band ${b} gain (dB)` }
			defs[`ch${ch}_band${b}_q`] = { name: `CH${ch} EQ band ${b} Q` }
		}
	}
	for (let a = 1; a <= AUXES; a++) {
		defs[`aux${a}_mute`] = { name: `AUX${a} muted` }
		defs[`aux${a}_fader`] = { name: `AUX${a} fader (dB)` }
	}
	defs['main_l_mute'] = { name: 'Main L muted' }
	defs['main_r_mute'] = { name: 'Main R muted' }
	for (let d = 1; d <= DCAS; d++) {
		defs[`dca${d}_on`] = { name: `DCA${d} on` }
		defs[`dca${d}_fader`] = { name: `DCA${d} fader (dB)` }
	}
	self.setVariableDefinitions(defs)
}

export function VariableValues(self: ModuleInstance): VariablesSchema {
	const out: VariablesSchema = {}
	const get = (id: number): number | undefined => self.value(id)
	const put = <T>(key: string, raw: number | undefined, fmt: (v: number) => T): void => {
		if (raw !== undefined) out[key] = fmt(raw) as string | number | boolean
	}
	const freq = (v: number): string => (v & OFF_FLAG ? 'off' : String(v))
	for (let ch = 1; ch <= INPUTS; ch++) {
		put(`ch${ch}_mute`, get(ids.mute(`CH${ch}`)), (v) => v === 0)
		put(`ch${ch}_fader`, get(ids.fader(`CH${ch}`)), (v) => dB(scale.faderFromRaw(v)))
		put(`ch${ch}_gain`, get(ids.gain(ch)), (v) => v)
		put(`ch${ch}_eq`, get(ids.eq(ch)), (v) => v === 1)
		put(`ch${ch}_hpf`, get(ids.hpf(ch)), freq)
		put(`ch${ch}_lpf`, get(ids.lpf(ch)), freq)
		for (let b = 1; b <= BANDS; b++) {
			put(`ch${ch}_band${b}_freq`, get(ids.bandFreq(ch, b)), freq)
			put(`ch${ch}_band${b}_gain`, get(ids.bandGain(ch, b)), (v) => dB(scale.bandGainFromRaw(v)))
			put(`ch${ch}_band${b}_q`, get(ids.bandQ(ch, b)), (v) => scale.qFromRaw(v).toFixed(2))
		}
	}
	for (let a = 1; a <= AUXES; a++) {
		put(`aux${a}_mute`, get(ids.mute(`AUX${a}`)), (v) => v === 0)
		put(`aux${a}_fader`, get(ids.fader(`AUX${a}`)), (v) => dB(scale.faderFromRaw(v)))
	}
	put('main_l_mute', get(ids.mute('L')), (v) => v === 0)
	put('main_r_mute', get(ids.mute('R')), (v) => v === 0)
	for (let d = 1; d <= DCAS; d++) {
		put(`dca${d}_on`, get(ids.dcaOn(d)), (v) => v === 1)
		put(`dca${d}_fader`, get(ids.dcaFader(d)), (v) => dB(scale.faderFromRaw(v)))
	}
	return out
}
