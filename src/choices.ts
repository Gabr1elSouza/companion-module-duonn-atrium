import type { DropdownChoice } from '@companion-module/base'
import { AUXES, BANDS, DCAS, INPUTS } from './protocol.js'

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1)

export const CHANNELS: DropdownChoice<number>[] = range(INPUTS).map((n) => ({ id: n, label: `CH${n}` }))
export const BAND_CHOICES: DropdownChoice<number>[] = range(BANDS).map((n) => ({ id: n, label: `Band ${n}` }))
export const DCA_CHOICES: DropdownChoice<number>[] = range(DCAS).map((n) => ({ id: n, label: `DCA${n}` }))

export const FADER_TARGETS: DropdownChoice<string>[] = [
	...range(INPUTS).map((n) => ({ id: `CH${n}`, label: `CH${n}` })),
	...range(AUXES).map((n) => ({ id: `AUX${n}`, label: `AUX${n}` })),
]

export const MUTE_TARGETS: DropdownChoice<string>[] = [
	...FADER_TARGETS,
	{ id: 'L', label: 'Main L' },
	{ id: 'R', label: 'Main R' },
]

export const ON_OFF_TOGGLE: DropdownChoice<string>[] = [
	{ id: 'on', label: 'On' },
	{ id: 'off', label: 'Off' },
	{ id: 'toggle', label: 'Toggle' },
]
