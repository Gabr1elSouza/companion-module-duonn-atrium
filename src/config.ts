import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
	host: string
	port: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			label: 'Information',
			width: 12,
			value:
				'Controls a Duonn Atrium 20 over the network. The console only takes an address from DHCP, so it needs a router (or a DHCP server) on its network. See the help for details.',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Console IP',
			width: 8,
			regex: Regex.IP,
			default: '192.168.1.10',
		},
		{
			type: 'number',
			id: 'port',
			label: 'Port',
			width: 4,
			min: 1,
			max: 65535,
			default: 8088,
		},
	]
}
