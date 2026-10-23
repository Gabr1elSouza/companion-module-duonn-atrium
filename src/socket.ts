// Minimal WebSocket client. The console's server rejects Node's built-in WebSocket
// handshake, so this speaks the protocol directly over a TCP socket.
import net from 'node:net'
import { createHash, randomBytes } from 'node:crypto'

export interface MixerSocketEvents {
	open: () => void
	message: (data: Buffer) => void
	close: (reason: string) => void
	error: (err: Error) => void
}

function clientFrame(data: Buffer, opcode: number): Buffer {
	const mask = randomBytes(4)
	const len = data.length
	const head =
		len < 126
			? Buffer.from([0x80 | opcode, 0x80 | len])
			: Buffer.from([0x80 | opcode, 0x80 | 126, len >> 8, len & 0xff])
	const masked = Buffer.alloc(len)
	for (let i = 0; i < len; i++) masked[i] = data[i] ^ mask[i & 3]
	return Buffer.concat([head, mask, masked])
}

export class MixerSocket {
	private sock: net.Socket | undefined
	private buf = Buffer.alloc(0)
	private open = false

	constructor(
		private readonly host: string,
		private readonly port: number,
		private readonly on: MixerSocketEvents,
	) {}

	connect(): void {
		const key = randomBytes(16).toString('base64')
		const accept = createHash('sha1')
			.update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
			.digest('base64')
		const sock = net.connect(this.port, this.host, () => {
			sock.write(
				`GET / HTTP/1.1\r\nHost: ${this.host}:${this.port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n` +
					`Origin: http://${this.host}\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: ${key}\r\n\r\n`,
			)
		})
		sock.setTimeout(10000)
		sock.on('timeout', () => sock.destroy(new Error('timeout')))
		sock.on('data', (d: Buffer) => this.onData(d, accept))
		sock.on('error', (e) => this.on.error(e))
		sock.on('close', () => {
			this.open = false
			this.on.close('closed')
		})
		this.sock = sock
	}

	get isOpen(): boolean {
		return this.open
	}

	send(data: Buffer): void {
		if (this.open && this.sock) this.sock.write(clientFrame(data, 0x02))
	}

	destroy(): void {
		const sock = this.sock
		this.sock = undefined
		this.open = false
		if (!sock) return
		sock.removeAllListeners()
		sock.on('error', () => {})
		sock.destroy()
	}

	private onData(d: Buffer, accept: string): void {
		this.buf = Buffer.concat([this.buf, d])
		if (!this.open) {
			const end = this.buf.indexOf('\r\n\r\n')
			if (end < 0) return
			const head = this.buf.subarray(0, end).toString()
			if (!head.startsWith('HTTP/1.1 101') || !head.includes(accept)) {
				this.sock?.destroy(new Error('WebSocket handshake refused'))
				return
			}
			this.open = true
			this.buf = this.buf.subarray(end + 4)
			this.on.open()
		}
		let i = 0
		while (i + 2 <= this.buf.length) {
			const opcode = this.buf[i] & 0x0f
			let len = this.buf[i + 1] & 0x7f
			const masked = this.buf[i + 1] & 0x80
			let j = i + 2
			if (len === 126) {
				if (j + 2 > this.buf.length) break
				len = this.buf.readUInt16BE(j)
				j += 2
			} else if (len === 127) {
				if (j + 8 > this.buf.length) break
				len = Number(this.buf.readBigUInt64BE(j))
				j += 8
			}
			const maskKey = masked ? this.buf.subarray(j, j + 4) : undefined
			if (masked) j += 4
			if (j + len > this.buf.length) break
			const data = Buffer.from(this.buf.subarray(j, j + len))
			if (maskKey) for (let k = 0; k < data.length; k++) data[k] ^= maskKey[k & 3]
			i = j + len
			if (opcode === 0x08) this.sock?.end()
			else if (opcode === 0x09) this.sock?.write(clientFrame(data, 0x0a))
			else if (opcode === 0x01 || opcode === 0x02) this.on.message(data)
		}
		this.buf = this.buf.subarray(i)
	}
}
