# nip46-sdk

Development kit for creating a NIP-46 remote signing client.

## Features

* Nostr client for handling the JSON-RPC messages.
* Session manager for creating and registering sessions.
* Provides API for custom integration of signing methods.
* Supports `bunker://` and `nostrconnect://` URI schemes.

## Overview

This project provides the basic tools nessecary to build your own NIP-46 signing client, using the following building blocks:

`NostrClient`: Basic client for handling JSON-RPC messages. Connects to a list of relays, and listens for NIP-46 messages. Also supports sending NIP-46 messages.

`SessionManager`: Class for creating, registering, and managing NIP-46 connection requests. Supports both `bunker://` and `nostrconnect://` URI schemes for establishing a session. Will also filter incoming NIP-46 requests and provide basic authentication.

`SignDeviceAPI`: API interface for connecting a signing device. This allows you to plug-in your own device and hook it into the signing methods required by the `NostrClient` and `SessionManager`.

`EventEmitter`: Both the `NostrClient` and `SessionManager` supply a modular emitter interface for registering your own hooks and custom logic.

This SDK is designed to be as un-opinionated as possible. It should work with your own signing device and user application.

## Installation

```bash
npm install @cmdcode/nip46-sdk
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License
