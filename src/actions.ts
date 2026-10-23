import type ModuleInstance from './main.js'
import { BAND_CHOICES, CHANNELS, DCA_CHOICES, FADER_TARGETS, MUTE_TARGETS, ON_OFF_TOGGLE } from './choices.js'
import { OFF_FLAG, clamp, ids, scale, type FaderTarget, type MuteTarget } from './protocol.js'

export type ActionsSchema = {
	mute: { options: { target: string; mode: string } }
	fader_set: { options: { target: string; db: number } }
	fader_adjust: { options: { target: string; step: number } }
	dca_on: { options: { dca: number; mode: string } }
	dca_fader_set: { options: { dca: number; db: number } }
	gain_set: { options: { ch: number; db: number } }
	gain_adjust: { options: { ch: number; step: number } }
	eq_on: { options: { ch: number; mode: string } }
	hpf: { options: { ch: number; mode: string; freq: number } }
	lpf_set: { options: { ch: number; freq: number } }
	band_freq: { options: { ch: number; band: number; freq: number } }
	band_gain: { options: { ch: number; band: number; db: number } }
	band_gain_adjust: { options: { ch: number; band: number; step: number } }
	band_q: { options: { ch: number; band: number; q: number } }
	band_on: { options: { ch: number; band: number; mode: string } }
	rename: { options: { ch: number; name: string } }
}

const channel = { id: 'ch', type: 'dropdown', label: 'Channel', choices: CHANNELS, default: 1 } as const
const band = { id: 'band', type: 'dropdown', label: 'Band', choices: BAND_CHOICES, default: 1 } as const
const mode = (label: string, choices = ON_OFF_TOGGLE) =>
	({ id: 'mode', type: 'dropdown', label, choices, default: 'toggle' }) as const

// Resolves on/off/toggle against the current state; isOn says what "on" looks like for this id
function resolve(m: string, current: number | undefined, isOn: (v: number) => boolean): boolean {
	if (m === 'on') return true
	if (m === 'off') return false
	return current === undefined ? true : !isOn(current)
}

export function UpdateActions(self: ModuleInstance): void {
	const withFlag = (id: number, on: boolean, fallbackHz: number): void => {
		const cur = self.value(id) ?? fallbackHz | OFF_FLAG
		self.set(id, on ? cur & ~OFF_FLAG : cur | OFF_FLAG)
	}

	self.setActionDefinitions({
		mute: {
			name: 'Mute: channel, aux or main',
			options: [
				{ id: 'target', type: 'dropdown', label: 'Target', choices: MUTE_TARGETS, default: 'CH1' },
				mode('Mute', [
					{ id: 'on', label: 'Mute' },
					{ id: 'off', label: 'Unmute' },
					{ id: 'toggle', label: 'Toggle' },
				]),
			],
			callback: (e) => {
				const id = ids.mute(e.options.target as MuteTarget)
				const mute = resolve(e.options.mode, self.value(id), (v) => v === 0)
				self.set(id, mute ? 0 : 1)
			},
		},
		fader_set: {
			name: 'Fader: set level',
			options: [
				{ id: 'target', type: 'dropdown', label: 'Fader', choices: FADER_TARGETS, default: 'CH1' },
				{ id: 'db', type: 'number', label: 'Level (dB, -120 = -inf)', default: 0, min: -120, max: 10, step: 0.5 },
			],
			callback: (e) => self.set(ids.fader(e.options.target as FaderTarget), scale.faderToRaw(e.options.db)),
		},
		fader_adjust: {
			name: 'Fader: nudge up/down',
			options: [
				{ id: 'target', type: 'dropdown', label: 'Fader', choices: FADER_TARGETS, default: 'CH1' },
				{ id: 'step', type: 'number', label: 'Step (dB, negative = down)', default: 1, min: -20, max: 20, step: 0.5 },
			],
			callback: (e) => {
				const id = ids.fader(e.options.target as FaderTarget)
				const cur = self.value(id)
				if (cur === undefined) return self.log('warn', 'Fader level not read yet, try again in a moment')
				const now = cur === 0 ? -90 : scale.faderFromRaw(cur)
				self.set(id, scale.faderToRaw(now + e.options.step))
			},
		},
		dca_on: {
			name: 'DCA: on/off',
			options: [{ id: 'dca', type: 'dropdown', label: 'DCA', choices: DCA_CHOICES, default: 1 }, mode('State')],
			callback: (e) => {
				const id = ids.dcaOn(e.options.dca)
				self.set(id, resolve(e.options.mode, self.value(id), (v) => v === 1) ? 1 : 0)
			},
		},
		dca_fader_set: {
			name: 'DCA: set fader level',
			options: [
				{ id: 'dca', type: 'dropdown', label: 'DCA', choices: DCA_CHOICES, default: 1 },
				{ id: 'db', type: 'number', label: 'Level (dB, -120 = -inf)', default: 0, min: -120, max: 10, step: 0.5 },
			],
			callback: (e) => self.set(ids.dcaFader(e.options.dca), scale.faderToRaw(e.options.db)),
		},
		gain_set: {
			name: 'Input: set gain',
			options: [channel, { id: 'db', type: 'number', label: 'Gain (dB)', default: 0, min: 0, max: 60, step: 1 }],
			callback: (e) => self.set(ids.gain(e.options.ch), clamp(Math.round(e.options.db), 0, 60)),
		},
		gain_adjust: {
			name: 'Input: nudge gain',
			options: [channel, { id: 'step', type: 'number', label: 'Step (dB)', default: 1, min: -20, max: 20, step: 1 }],
			callback: (e) => {
				const id = ids.gain(e.options.ch)
				const cur = self.value(id)
				if (cur === undefined) return self.log('warn', 'Gain not read yet, try again in a moment')
				self.set(id, clamp(cur + Math.round(e.options.step), 0, 60))
			},
		},
		eq_on: {
			name: 'EQ: on/bypass',
			options: [
				channel,
				mode('EQ', [
					{ id: 'on', label: 'On' },
					{ id: 'off', label: 'Bypass' },
					{ id: 'toggle', label: 'Toggle' },
				]),
			],
			callback: (e) => {
				const id = ids.eq(e.options.ch)
				self.set(id, resolve(e.options.mode, self.value(id), (v) => v === 1) ? 1 : 0)
			},
		},
		hpf: {
			name: 'EQ: high-pass filter',
			options: [
				channel,
				mode('State', [
					{ id: 'set', label: 'On at frequency' },
					{ id: 'on', label: 'On (keep frequency)' },
					{ id: 'off', label: 'Off' },
					{ id: 'toggle', label: 'Toggle' },
				]),
				{ id: 'freq', type: 'number', label: 'Frequency (Hz)', default: 100, min: 20, max: 20000 },
			],
			callback: (e) => {
				const id = ids.hpf(e.options.ch)
				if (e.options.mode === 'set') return self.set(id, scale.hzToRaw(e.options.freq))
				const on = resolve(e.options.mode, self.value(id), (v) => (v & OFF_FLAG) === 0)
				withFlag(id, on, 100)
			},
		},
		lpf_set: {
			name: 'EQ: low-pass frequency',
			options: [channel, { id: 'freq', type: 'number', label: 'Frequency (Hz)', default: 20000, min: 20, max: 20000 }],
			callback: (e) => self.set(ids.lpf(e.options.ch), scale.hzToRaw(e.options.freq)),
		},
		band_freq: {
			name: 'EQ band: set frequency',
			description: 'Also switches the band on',
			options: [
				channel,
				band,
				{ id: 'freq', type: 'number', label: 'Frequency (Hz)', default: 1000, min: 20, max: 20000 },
			],
			callback: (e) => self.set(ids.bandFreq(e.options.ch, e.options.band), scale.hzToRaw(e.options.freq)),
		},
		band_gain: {
			name: 'EQ band: set gain',
			options: [
				channel,
				band,
				{ id: 'db', type: 'number', label: 'Gain (dB)', default: 0, min: -15, max: 15, step: 0.5 },
			],
			callback: (e) => self.set(ids.bandGain(e.options.ch, e.options.band), scale.bandGainToRaw(e.options.db)),
		},
		band_gain_adjust: {
			name: 'EQ band: nudge gain',
			options: [
				channel,
				band,
				{ id: 'step', type: 'number', label: 'Step (dB)', default: 1, min: -15, max: 15, step: 0.5 },
			],
			callback: (e) => {
				const id = ids.bandGain(e.options.ch, e.options.band)
				const cur = self.value(id)
				if (cur === undefined) return self.log('warn', 'EQ not read yet, try again in a moment')
				const next = clamp(scale.bandGainFromRaw(cur) + e.options.step, -15, 15)
				self.set(id, scale.bandGainToRaw(next))
			},
		},
		band_q: {
			name: 'EQ band: set Q',
			options: [channel, band, { id: 'q', type: 'number', label: 'Q', default: 1, min: 0.3, max: 10, step: 0.05 }],
			callback: (e) => self.set(ids.bandQ(e.options.ch, e.options.band), scale.qToRaw(e.options.q)),
		},
		band_on: {
			name: 'EQ band: on/off',
			options: [channel, band, mode('State')],
			callback: (e) => {
				const id = ids.bandFreq(e.options.ch, e.options.band)
				withFlag(
					id,
					resolve(e.options.mode, self.value(id), (v) => (v & OFF_FLAG) === 0),
					1000,
				)
			},
		},
		rename: {
			name: 'Input: rename channel',
			options: [channel, { id: 'name', type: 'textinput', label: 'Name (ASCII, up to 16 characters)', default: '' }],
			callback: (e) => self.rename(e.options.ch, e.options.name),
		},
	})
}
