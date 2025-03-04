import { useEffect } from 'react'
import { useUnmount } from 'react-use'
import type { User } from '~/types/Messages'
import type Peer from '~/utils/Peer.client'
import type Signal from '~/utils/Signal'
import type { RoomContextType } from './useRoomContext'
import type { UserMedia } from './useUserMedia'

interface Config {
	userMedia: UserMedia
	peer: Peer | null
	identity?: User | null
	signal: Signal
	pushedTracks: RoomContextType['pushedTracks']
	raisedHand: boolean
	speaking: boolean
}

export default function useBroadcastStatus({
	userMedia,
	identity,
	signal,
	peer,
	pushedTracks,
	raisedHand,
	speaking,
}: Config) {
	const { audioEnabled, videoEnabled, screenShareEnabled } = userMedia
	const { audio, video, screenshare } = pushedTracks

	const id = identity?.id
	const name = identity?.name
	const role = identity?.role
	useEffect(() => {
		if (id && name && role) {
			signal.sendMessage({
				type: 'userUpdate',
				user: {
					id,
					name,
					role,
					joined: true,
					raisedHand,
					speaking,
					transceiverSessionId: peer?.sessionId,
					tracks: {
						audioEnabled,
						videoEnabled,
						screenShareEnabled,
						video,
						audio,
						screenshare,
					},
				},
			})
		}
	}, [
		id,
		name,
		role,
		signal,
		peer?.sessionId,
		audio,
		video,
		screenshare,
		audioEnabled,
		videoEnabled,
		screenShareEnabled,
		raisedHand,
		speaking,
	])

	useUnmount(() => {
		if (id && name && role) {
			signal.sendMessage({
				type: 'userUpdate',
				user: {
					id,
					name,
					role,
					joined: false,
					raisedHand,
					speaking,
					transceiverSessionId: peer?.sessionId,
					tracks: {},
				},
			})
		}
	})
}
