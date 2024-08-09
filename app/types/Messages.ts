export type User = {
	id: string
	name: string
	role: string
	transceiverSessionId?: string
	raisedHand: boolean
	speaking: boolean
	joined: boolean
	tracks: {
		audio?: string
		audioEnabled?: boolean
		video?: string
		videoEnabled?: boolean
		screenshare?: string
		screenShareEnabled?: boolean
	}
}

export type RoomState = {
	users: User[]
}

export type ServerMessage =
	| {
			type: 'roomState'
			state: RoomState
	  }
	| {
			type: 'error'
			error?: string
	  }
	| {
			type: 'identity'
			id: string
	  }
	| {
			type: 'directMessage'
			from: string
			message: string
	  }
	| {
			type: 'muteMic'
	  }
	| {
			type: 'chatMessage'
			to: string
			from: string
			message: string
			roomId: string
	  }
	| {
			type: 'chatMessage'
			to: string
			from: string
			message: string
			roomId: string
	  }
	| {
			type: 'chatMessage'
			to: string
			from: string
			message: string
			roomId: string
	  }
	| { type: 'callDurationUpdate'; duration: number }
	| { type: 'callDurationExtended'; newMaxDuration: number }
	| { type: 'callEnded'; reason: string }

export type MessageFromServer = {
	from: string
	timestamp: number
	message: ServerMessage
}

export type ClientMessage =
	| {
			type: 'userUpdate'
			user: User
	  }
	| {
			type: 'directMessage'
			to: string
			message: string
	  }
	| {
			type: 'muteUser'
			id: string
	  }
	| {
			type: 'userLeft'
	  }
	| {
			type: 'heartBeat'
	  }
	| {
			type: 'chatMessage'
			roomId: string
			from: string
			message: string
	  }
	| { type: 'extendCallDuration'; extension: number }
