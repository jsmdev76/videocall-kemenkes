import { useEffect, useMemo, useRef, useState } from 'react'
import { useIsomorphicLayoutEffect } from 'react-use'
import type { MessageFromServer, RoomState, User } from '~/types/Messages'
import assertNever from '~/utils/assertNever'
import useSignal from './useSignal'
import type { UserMedia } from './useUserMedia'
import { useRoomUrl } from './useRoomUrl'
import { useParams } from '@remix-run/react'

type Role = 'listener' | 'whisper' | 'agent' | 'client' | 'recorder'

const isValidRole = (role: string | null): role is Role => {
  return role === 'listener' || role === 'whisper' || role === 'agent' || role === 'client'
}


export default function useRoom({
	roomName,
	userMedia,
}: {
	roomName: string
	userMedia: UserMedia
}) {
	const { signal } = useSignal(roomName)
	const [roomState, setRoomState] = useState<RoomState>({ users: [] })
	const [error, setError] = useState<string | null>(null)
	const [messages, setMessages] = useState<{ from: string; message: string; roomId: string }[]>(
		[]
	)
	const [userId, setUserId] = useState<string>()
	const queryParams = new URLSearchParams(window.location.search)
	const roleParam = queryParams.get('role')
	const usernameParam = queryParams.get("username")
	// const whisperParam = queryParams.get('whisper')
	// const listenerParam = queryParams.get('listener')

	console.log("params :", roomName)

	useEffect(() => {
		if (!roleParam && !isValidRole(roleParam)) {
		  setError(`Invalid role: ${roleParam}. Valid roles are: listener, whisper, agent, client.`)
		} else {
		  setError(null)
		}
	  }, [roleParam])
	

	// using the latest ref pattern here so we don't need to keep rebinding
	// the message handler every time a dependency changes
	// https://epicreact.dev/the-latest-ref-pattern-in-react/
	const messageHandler = (e: MessageEvent<MessageFromServer>) => {
		const { message } = e.data

		console.log(message)

		switch (message.type) {
			case 'roomState':
				// prevent updating state if nothing has changed
				if (JSON.stringify(message.state) === JSON.stringify(roomState)) break
				// setRoomState(message.state)

				console.log({identity,state: message.state})

				const modifiedState = {
					...message.state,
					users: message.state.users.map((user: User) => {
						if (user.id === userId) {
							return {
								...user,
								name: roleParam === "whisper" || roleParam === "listener" ? roleParam : user.name,
								role: isValidRole(roleParam) ? roleParam : user.role,
								// name: whisperParam || listenerParam || user.name,
								// role: listenerParam
								// 	? 'listener'
								// 	: whisperParam
								// 		? 'whisper'
								// 		: user.role,
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
					{ from: message.from, message: message.message, roomId: message.roomId },
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
				name: user.name,
				role: user.role,
			}
		}
		return user
	}, [roomState.users, userId, roleParam])

	const otherUsers = useMemo(
		() => roomState.users.filter((u) => u.id !== userId && u.joined),
		[userId, roomState.users]
	)

	const sendChat = ({ message }: { message: string }) => {
		if (identity) {
			signal.sendChat({
				from: identity.id,
				roomId: roomName,
				message,
			})
		}
	}

	return { identity, otherUsers, signal, roomState, sendChat, messages, error }
}
