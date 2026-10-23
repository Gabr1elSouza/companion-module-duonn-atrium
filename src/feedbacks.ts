import { combineRgb } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { CHANNELS, DCA_CHOICES, MUTE_TARGETS } from './choices.js'
import { OFF_FLAG, ids, type MuteTarget } from './protocol.js'

export type FeedbacksSchema = {
	muted: { type: 'boolean'; options: { target: string } }
	dca_off: { type: 'boolean'; options: { dca: number } }
	eq_bypassed: { type: 'boolean'; options: { ch: number } }
	hpf_on: { type: 'boolean'; options: { ch: number } }
}

const RED = { bgcolor: combineRgb(200, 0, 0), color: combineRgb(255, 255, 255) }
const AMBER = { bgcolor: combineRgb(200, 120, 0), color: combineRgb(0, 0, 0) }
const GREEN = { bgcolor: combineRgb(0, 140, 60), color: combineRgb(255, 255, 255) }

export function UpdateFeedbacks(self: ModuleInstance): void {
	self.setFeedbackDefinitions({
		muted: {
			name: 'Mute: channel, aux or main is muted',
			type: 'boolean',
			defaultStyle: RED,
			options: [{ id: 'target', type: 'dropdown', label: 'Target', choices: MUTE_TARGETS, default: 'CH1' }],
			callback: (fb) => self.value(ids.mute(fb.options.target as MuteTarget)) === 0,
		},
		dca_off: {
			name: 'DCA: group is off',
			type: 'boolean',
			defaultStyle: RED,
			options: [{ id: 'dca', type: 'dropdown', label: 'DCA', choices: DCA_CHOICES, default: 1 }],
			callback: (fb) => self.value(ids.dcaOn(fb.options.dca)) === 0,
		},
		eq_bypassed: {
			name: 'EQ: channel EQ is bypassed',
			type: 'boolean',
			defaultStyle: AMBER,
			options: [{ id: 'ch', type: 'dropdown', label: 'Channel', choices: CHANNELS, default: 1 }],
			callback: (fb) => self.value(ids.eq(fb.options.ch)) === 0,
		},
		hpf_on: {
			name: 'EQ: high-pass filter is on',
			type: 'boolean',
			defaultStyle: GREEN,
			options: [{ id: 'ch', type: 'dropdown', label: 'Channel', choices: CHANNELS, default: 1 }],
			callback: (fb) => {
				const v = self.value(ids.hpf(fb.options.ch))
				return v !== undefined && (v & OFF_FLAG) === 0
			},
		},
	})
}
