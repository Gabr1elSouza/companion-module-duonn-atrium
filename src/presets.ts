import { combineRgb, type CompanionPresetDefinitions, type CompanionPresetSection } from '@companion-module/base'
import type ModuleInstance from './main.js'
import type { ModuleSchema } from './main.js'
import { AUXES, DCAS, INPUTS } from './protocol.js'

const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)
const RED = combineRgb(200, 0, 0)
const AMBER = combineRgb(200, 120, 0)
const GREEN = combineRgb(0, 140, 60)
const DARK = combineRgb(30, 30, 30)

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1)

export function UpdatePresets(self: ModuleInstance): void {
	const presets: CompanionPresetDefinitions<ModuleSchema> = {}
	const style = (text: string) => ({ text, size: 'auto' as const, color: WHITE, bgcolor: DARK, show_topbar: false })

	const muteTargets = [
		...range(INPUTS).map((n) => [`CH${n}`, `CH${n}`]),
		...range(AUXES).map((n) => [`AUX${n}`, `AUX${n}`]),
		['L', 'MAIN L'],
		['R', 'MAIN R'],
	]
	for (const [target, label] of muteTargets) {
		presets[`mute_${target}`] = {
			type: 'simple',
			name: `Mute ${label}`,
			style: style(`${label}\\nMUTE`),
			steps: [{ down: [{ actionId: 'mute', options: { target, mode: 'toggle' } }], up: [] }],
			feedbacks: [{ feedbackId: 'muted', options: { target }, style: { bgcolor: RED, color: WHITE } }],
		}
	}

	for (const d of range(DCAS)) {
		presets[`dca_${d}`] = {
			type: 'simple',
			name: `DCA${d} on/off`,
			style: style(`DCA${d}`),
			steps: [{ down: [{ actionId: 'dca_on', options: { dca: d, mode: 'toggle' } }], up: [] }],
			feedbacks: [{ feedbackId: 'dca_off', options: { dca: d }, style: { bgcolor: RED, color: WHITE } }],
		}
	}

	for (const ch of range(INPUTS)) {
		const fader = (key: string, name: string, text: string, actionId: 'fader_set' | 'fader_adjust', value: number) => {
			presets[`fader_${ch}_${key}`] = {
				type: 'simple',
				name: `CH${ch} ${name}`,
				style: style(`CH${ch}\\n${text}`),
				steps: [
					{
						down: [
							actionId === 'fader_set'
								? { actionId, options: { target: `CH${ch}`, db: value } }
								: { actionId, options: { target: `CH${ch}`, step: value } },
						],
						up: [],
					},
				],
				feedbacks: [],
			}
		}
		fader('up', 'fader +1 dB', '+1 dB', 'fader_adjust', 1)
		fader('down', 'fader -1 dB', '-1 dB', 'fader_adjust', -1)
		fader('0db', 'fader to 0 dB', '0 dB', 'fader_set', 0)
		fader('inf', 'fader to -inf', '-inf', 'fader_set', -120)

		presets[`gain_up_${ch}`] = {
			type: 'simple',
			name: `CH${ch} gain +1 dB`,
			style: style(`CH${ch}\\nGAIN +1`),
			steps: [{ down: [{ actionId: 'gain_adjust', options: { ch, step: 1 } }], up: [] }],
			feedbacks: [],
		}
		presets[`gain_down_${ch}`] = {
			type: 'simple',
			name: `CH${ch} gain -1 dB`,
			style: style(`CH${ch}\\nGAIN -1`),
			steps: [{ down: [{ actionId: 'gain_adjust', options: { ch, step: -1 } }], up: [] }],
			feedbacks: [],
		}
		presets[`eq_${ch}`] = {
			type: 'simple',
			name: `CH${ch} EQ bypass`,
			style: style(`CH${ch}\\nEQ`),
			steps: [{ down: [{ actionId: 'eq_on', options: { ch, mode: 'toggle' } }], up: [] }],
			feedbacks: [{ feedbackId: 'eq_bypassed', options: { ch }, style: { bgcolor: AMBER, color: BLACK } }],
		}
		presets[`hpf_${ch}`] = {
			type: 'simple',
			name: `CH${ch} high-pass on/off`,
			style: style(`CH${ch}\\nHPF`),
			steps: [{ down: [{ actionId: 'hpf', options: { ch, mode: 'toggle', freq: 100 } }], up: [] }],
			feedbacks: [{ feedbackId: 'hpf_on', options: { ch }, style: { bgcolor: GREEN, color: WHITE } }],
		}
	}

	const ref = (prefix: string, list: Array<string | number>) => list.map((k) => `${prefix}${k}`)
	const structure: CompanionPresetSection<ModuleSchema>[] = [
		{
			id: 'mute',
			name: 'Mute',
			definitions: [
				{ id: 'mute_inputs', type: 'simple', name: 'Inputs', presets: ref('mute_CH', range(INPUTS)) },
				{
					id: 'mute_outputs',
					type: 'simple',
					name: 'Aux and main',
					presets: [...ref('mute_AUX', range(AUXES)), 'mute_L', 'mute_R'],
				},
			],
		},
		{ id: 'dca', name: 'DCA', definitions: ref('dca_', range(DCAS)) },
		{
			id: 'channel',
			name: 'Channel strip',
			definitions: range(INPUTS).map((ch) => ({
				id: `strip_${ch}`,
				type: 'simple' as const,
				name: `CH${ch}`,
				presets: [
					`fader_${ch}_up`,
					`fader_${ch}_down`,
					`fader_${ch}_0db`,
					`fader_${ch}_inf`,
					`gain_up_${ch}`,
					`gain_down_${ch}`,
					`eq_${ch}`,
					`hpf_${ch}`,
				],
			})),
		},
	]

	self.setPresetDefinitions(structure, presets)
}
