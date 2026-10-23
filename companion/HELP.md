## Duonn Atrium

Controls a **Duonn Atrium 20** digital mixer over the network: mutes, faders, DCAs, input gain and the channel EQ. Button colours follow the console, so a change made on the console itself shows up on your buttons within about a second.

### Connecting

1. Connect the console to your network with a cable. The console only takes its address from **DHCP**, so a router (or another DHCP server) must be on that network.
2. Find the console's IP address (in the router's client list, or on the console's network screen).
3. Add this connection in Companion and enter that IP. Leave the port at **8088**.

The status turns green once the console answers. If it stays red, check that the PC running Companion can reach the console (same network, same subnet).

### Actions

| Action                            | What it does                                                                |
| --------------------------------- | --------------------------------------------------------------------------- |
| Mute: channel, aux or main        | Mute, unmute or toggle CH1–16, AUX1–8, Main L or Main R                     |
| Fader: set level                  | Set a channel or aux fader to a level in dB (-120 = -inf)                   |
| Fader: nudge up/down              | Move a fader by a step in dB                                                |
| DCA: on/off                       | Switch DCA1–4 on, off or toggle                                             |
| DCA: set fader level              | Set a DCA fader in dB                                                       |
| Input: set gain / nudge gain      | Set or step the input gain of CH1–16 (dB)                                   |
| EQ: on/bypass                     | Switch a channel's EQ on, to bypass, or toggle                              |
| EQ: high-pass filter              | Switch the high-pass on at a frequency, on, off or toggle                   |
| EQ: low-pass frequency            | Set the low-pass frequency (Hz)                                             |
| EQ band: set frequency / gain / Q | Set one of the 4 EQ bands (setting the frequency also switches the band on) |
| EQ band: nudge gain               | Step a band's gain in dB                                                    |
| EQ band: on/off                   | Switch one EQ band on, off or toggle                                        |
| Input: rename channel             | Write a name on the console's channel strip                                 |

Number fields accept expressions, so a level can come from a variable.

### Feedbacks

- **Mute: channel, aux or main is muted** (red)
- **DCA: group is off** (red)
- **EQ: channel EQ is bypassed** (amber)
- **EQ: high-pass filter is on** (green)

### Variables

Per channel: `chN_mute`, `chN_fader`, `chN_gain`, `chN_eq`, `chN_hpf`, `chN_lpf`, `chN_bandB_freq`, `chN_bandB_gain`, `chN_bandB_q`.
Also `auxN_mute`, `auxN_fader`, `main_l_mute`, `main_r_mute`, `dcaN_on`, `dcaN_fader`.

### Presets

Ready-made buttons for every mute, every DCA, and a channel strip per input (fader ±1 dB, 0 dB, -inf, gain ±1 dB, EQ bypass, high-pass).

### Notes

- Tested on the Atrium 20 (firmware in use in October 2026). The Atrium 32 belongs to the same family and probably works, but has not been tested.
- Scenes are not available: the console does not expose scene recall on the network.
- Input gain was confirmed on the console up to +6 dB; higher values are sent the same way.
