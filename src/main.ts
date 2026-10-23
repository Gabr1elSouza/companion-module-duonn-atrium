import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, VariableValues, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { MixerSocket } from './socket.js'
import { allIds, parseFrames, readFrame, setFrame, renameFrame } from './protocol.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

// The console drops a client after ~5 s without traffic; polling doubles as keepalive.
const POLL_MS = 1000
const POLL_BATCH = 20
const RECONNECT_MS = 5000

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig
	readonly state = new Map<number, number>()

	private socket: MixerSocket | undefined
	private pollTimer: NodeJS.Timeout | undefined
	private reconnectTimer: NodeJS.Timeout | undefined
	private pollIds = allIds()
	private pollIndex = 0
	private refreshQueued = false

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config
		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()
		this.connect()
	}

	async destroy(): Promise<void> {
		this.disconnect()
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		this.disconnect()
		this.state.clear()
		this.connect()
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	value(id: number): number | undefined {
		return this.state.get(id)
	}

	set(id: number, value: number): void {
		if (!this.socket?.isOpen) {
			this.log('warn', 'Not connected to the console, command dropped')
			return
		}
		this.socket.send(setFrame(id, value))
		this.apply([[id, value & 0xffff]])
	}

	rename(ch: number, name: string): void {
		this.socket?.send(renameFrame(ch, name))
	}

	private connect(): void {
		if (!this.config.host) {
			this.updateStatus(InstanceStatus.BadConfig, 'Set the console IP')
			return
		}
		this.updateStatus(InstanceStatus.Connecting)
		this.socket = new MixerSocket(this.config.host, this.config.port || 8088, {
			open: () => {
				this.updateStatus(InstanceStatus.Ok)
				this.pollIndex = 0
				this.pollTimer = setInterval(() => this.poll(), POLL_MS)
				this.poll()
			},
			message: (data) => this.onMessage(data),
			error: (err) => this.log('debug', `Socket error: ${err.message}`),
			close: () => this.scheduleReconnect(),
		})
		this.socket.connect()
	}

	private disconnect(): void {
		clearInterval(this.pollTimer)
		clearTimeout(this.reconnectTimer)
		this.pollTimer = undefined
		this.reconnectTimer = undefined
		this.socket?.destroy()
		this.socket = undefined
	}

	private scheduleReconnect(): void {
		this.disconnect()
		this.updateStatus(InstanceStatus.ConnectionFailure, `No answer from ${this.config.host}`)
		this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_MS)
	}

	private poll(): void {
		const batch = this.pollIds.slice(this.pollIndex, this.pollIndex + POLL_BATCH)
		this.pollIndex = this.pollIndex + POLL_BATCH >= this.pollIds.length ? 0 : this.pollIndex + POLL_BATCH
		this.socket?.send(readFrame(batch))
	}

	private onMessage(data: Buffer): void {
		const changes: Array<[number, number]> = []
		for (const f of parseFrames(data)) changes.push(...f.values)
		if (changes.length) this.apply(changes)
	}

	private apply(changes: Array<[number, number]>): void {
		let changed = false
		for (const [id, v] of changes) {
			if (this.state.get(id) !== v) {
				this.state.set(id, v)
				changed = true
			}
		}
		if (!changed || this.refreshQueued) return
		this.refreshQueued = true
		setImmediate(() => {
			this.refreshQueued = false
			this.setVariableValues(VariableValues(this))
			this.checkAllFeedbacks()
		})
	}
}
