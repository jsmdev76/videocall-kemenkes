import { useEffect, useMemo, useRef, useState } from 'react'
import { useIsomorphicLayoutEffect } from 'react-use'
import type { MessageFromServer, RoomState, User } from '~/types/Messages'
import assertNever from '~/utils/assertNever'
import useSignal from './useSignal'
import type { UserMedia } from './useUserMedia'
import { useRoomUrl } from './useRoomUrl'
import { useParams } from '@remix-run/react'

export default function useRoom({
	roomName,
	userMedia,
}: {
	roomName: string
	userMedia: UserMedia
}) {
	const { signal } = useSignal(roomName)
	const [roomState, setRoomState] = useState<RoomState>({ users: [] })
	const [messages, setMessages] = useState<{ from: string; message: string; roomId: string }[]>(
		[]
	)
	const [userId, setUserId] = useState<string>()
	const queryParams = new URLSearchParams(window.location.search)
	const whisperParam = queryParams.get('whisper')
	const listenerParam = queryParams.get('listener')

	console.log("params :", roomName)

	// using the latest ref pattern here so we don't need to keep rebinding
	// the message handler every time a dependency changes
	// https://epicreact.dev/the-latest-ref-pattern-in-react/
	const messageHandler = (e: MessageEvent<MessageFromServer>) => {
		const { message } = e.data

		switch (message.type) {
			case 'roomState':
				// prevent updating state if nothing has changed
				if (JSON.stringify(message.state) === JSON.stringify(roomState)) break
				// setRoomState(message.state)

				const modifiedState = {
					...message.state,
					users: message.state.users.map((user: User) => {
						if (user.id === userId) {
							return {
								...user,
								name: whisperParam || listenerParam || user.name,
								role: listenerParam
									? 'listener'
									: whisperParam
										? 'whisper'
										: user.role,
							}
						}
						return user
					}),
				}
				setRoomState(modifiedState)
				break
			case 'error':
				console.error('Received error message from WebSocket')
				console.error(message.error)
				break
			case 'identity':
				setUserId(message.id)
				break
			case 'directMessage':
				// TODO: handle DM's
				break
			case 'muteMic':
				userMedia.turnMicOff()
				break
			case 'chatMessage':
				setMessages((prevMessages) => [
					...prevMessages.filter(msg => msg.roomId === roomName),
					{ from: message.from, message: message.message, roomId: roomName },
				])
				break
				default:
					assertNever(message)
					break
				}
			}
			console.log("roomName ->", messages)
			
			const messageHandlerRef = useRef(messageHandler)
	useIsomorphicLayoutEffect(() => {
		messageHandlerRef.current = messageHandler
	})

	useEffect(() => {
		const messageHandler = (e: MessageEvent<MessageFromServer>) => {
			messageHandlerRef.current(e)
		}

		signal.addEventListener('message', messageHandler)

		return () => {
			signal.removeEventListener('message', messageHandler)
		}
	}, [roomName, signal, messages])

	const identity = useMemo(() => {
		// roomState.users.find((u) => u.id === userId)
		const user = roomState.users.find((u) => u.id === userId)
		if (user) {
			return {
				...user,
				name: whisperParam || listenerParam || user.name,
				role: listenerParam ? 'listener' : whisperParam ? 'whisper' : user.role,
			}
		}
		return user
	}, [roomState.users, userId, whisperParam, listenerParam])

	const otherUsers = useMemo(
		() => roomState.users.filter((u) => u.id !== userId && u.joined),
		[userId, roomState.users]
	)

	const sendChat = ({ message }: { message: string; roomId: string }) => {
		if (identity) {
			signal.sendChat({
				from: identity.id,
				roomId: roomName,
				message,
			})
		}
	}

	return { identity, otherUsers, signal, roomState, sendChat, messages }
}
