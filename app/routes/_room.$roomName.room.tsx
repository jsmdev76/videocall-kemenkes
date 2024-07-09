import type { LoaderFunctionArgs } from '@remix-run/cloudflare'
import { json } from '@remix-run/cloudflare'
import {
	useLoaderData,
	useNavigate,
	useParams,
	useRevalidator,
} from '@remix-run/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Flipper } from 'react-flip-toolkit'
import { useMeasure, useMount, useWindowSize } from 'react-use'
import { Button } from '~/components/Button'
import { CameraButton } from '~/components/CameraButton'
import FloatingChat from '~/components/FloatingChat'
import { HighPacketLossWarningsToast } from '~/components/HighPacketLossWarningsToast'
import { IceDisconnectedToast } from '~/components/IceDisconnectedToast'
import { Icon } from '~/components/Icon/Icon'
import { LeaveRoomButton } from '~/components/LeaveRoomButton'
import { MicButton } from '~/components/MicButton'
import { OverflowMenu } from '~/components/OverflowMenu'
import { Participant } from '~/components/Participant'
import { PullAudioTracks } from '~/components/PullAudioTracks'
import { PullVideoTrack } from '~/components/PullVideoTrack'
import Toast from '~/components/Toast'
import useBroadcastStatus from '~/hooks/useBroadcastStatus'
import useIsSpeaking from '~/hooks/useIsSpeaking'
import { useRoomContext } from '~/hooks/useRoomContext'
import useSounds from '~/hooks/useSounds'
import useStageManager from '~/hooks/useStageManager'
import { useUserJoinLeaveToasts } from '~/hooks/useUserJoinLeaveToasts'
import { calculateLayout } from '~/utils/calculateLayout'
import getDoctorToken, { setDoctorToken } from '~/utils/getDoctorToken.server'
import isNonNullable from '~/utils/isNonNullable'

export const loader = async ({
	request,
	context,
	params,
}: LoaderFunctionArgs) => {
	const host = context.URL_API
	const url = new URL(request.url)
	const role = url.searchParams.get('role')
	const username = url.searchParams.get('username')
	const roomName = params.roomName
	const doctorToken = await getDoctorToken(request)

	if (role && username && roomName) {
		if (!doctorToken && role === 'agent') {
			await setDoctorToken(
				'doctor',
				`${username} | Agent`,
				request,
				// `/pagenotfound`
				`/${roomName}/room?username=${username}&role=${role}`
			)
		}

		const response = await fetch(`${host}/call/action`, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'x-api-key': context.API_SECRET_KEY as string
			},
			body: JSON.stringify({
				roomId: roomName,
				action: 'accept',
			}),
		})
		let data: any = await response.json()
		console.log(data)
	}

	console.log({ role, username, roomName })
	// const trxClientToken = await getClientToken(request)
	// const doctorToken = await getDoctorToken(request)
	// const clientToken = await getUsername(request)

	const response = await fetch(`${host}/call/room/${roomName}`, {
		method: 'get',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': context.API_SECRET_KEY as string
		},
		// body: JSON.stringify({
		// 	roomName: roomName,
		// 	isDoctor: doctorToken ? true : false,
		// }),
	})

	const data: any = await response.json()
	// console.log({doctorToken, clientToken})
	// if (!data.success) {
	// 	throw new Response(data.message, { status: 500 })
	// }

	// const trxcall = data.data.trxcall
	// if (trxcall.trxCallStatus >= 2) {
	// 	await removeClientToken(request, `/end-room`)
	// 	if (doctorToken) {
	// 		throw redirect('/doctor')
	// 	} else {
	// 		throw redirect('/end-room')
	// 	}
	// }

	// const startDate = new Date(trxcall.trxUserDate)
	// const endDate = new Date()
	// const diffMinutes = (endDate.getTime() - startDate.getTime()) / 60000
	// if (diffMinutes > 1 && doctorToken) {
	// 	throw redirect('/doctor')
	// }

	return json({
		bugReportsEnabled: Boolean(context.FEEDBACK_QUEUE && context.FEEDBACK_URL),
		mode: context.mode,
		data,
		roomName,
		role,
		username,
	})
}

function useGridDebugControls(
	{
		initialCount,
		defaultEnabled,
	}: {
		initialCount: number
		defaultEnabled: boolean
	} = { initialCount: 0, defaultEnabled: false }
) {
	const [enabled, setEnabled] = useState(defaultEnabled)
	const [fakeUsers, setFakeUsers] = useState<string[]>(
		Array.from({ length: initialCount }).map(() => crypto.randomUUID())
	)

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() === 'd' && e.ctrlKey) {
				e.preventDefault()
				setEnabled(!enabled)
			}
		}
		document.addEventListener('keypress', handler)

		return () => {
			document.removeEventListener('keypress', handler)
		}
	}, [enabled])

	const GridDebugControls = useCallback(
		() =>
			enabled ? (
				<>
					<Button
						onClick={() => setFakeUsers((fu) => [...fu, crypto.randomUUID()])}
					>
						<Icon type="PlusIcon" />
					</Button>
					<Button
						onClick={() => {
							setFakeUsers((fu) => {
								const randomLeaver = fu[Math.floor(Math.random() * fu.length)]
								return fu.filter((x) => x !== randomLeaver)
							})
						}}
					>
						<Icon type="MinusIcon" />
					</Button>
				</>
			) : null,
		[enabled]
	)

	return {
		GridDebugControls,
		fakeUsers,
	}
}

export default function Room() {
	const {
		joined,
		room: { error },
	} = useRoomContext()
	const navigate = useNavigate()
	const { roomName } = useParams()
	const { mode, bugReportsEnabled, data } = useLoaderData<typeof loader>()

	// useEffect(() => {
	// 	if (!joined && mode !== 'development') navigate(`/${roomName}`)
	// }, [joined, mode, navigate, roomName])

	const revalidator = useRevalidator()

	useEffect(() => {
		if (data.data.callStatus == 0) {
			const intervalID = setInterval(() => {
				if (revalidator.state === 'idle') {
					revalidator.revalidate()
				}
			}, 5000)
			return () => clearInterval(intervalID)
		}
	}, [revalidator, data])

	useEffect(() => {
		window.onbeforeunload = () =>
			'Sesi akan berakhir jika anda keluar. Anda yakin?'
	}, [])

	// if (!joined && mode !== 'development') return null
	if (error) return <div>{error}</div>
	return (
		<Toast.Provider>
			<JoinedRoom
				bugReportsEnabled={bugReportsEnabled}
				roomId={roomName as string}
			/>
		</Toast.Provider>
	)
}

function JoinedRoom({
	bugReportsEnabled,
	roomId,
}: {
	bugReportsEnabled: boolean
	roomId: string
}) {
	const {
		userMedia,
		peer,
		pushedTracks,
		room: { otherUsers, signal, identity },
	} = useRoomContext()

	const { GridDebugControls, fakeUsers } = useGridDebugControls({
		defaultEnabled: false,
		initialCount: 0,
	})

	const [containerRef, { width: containerWidth, height: containerHeight }] =
		useMeasure<HTMLDivElement>()
	const [firstFlexChildRef, { width: firstFlexChildWidth }] =
		useMeasure<HTMLDivElement>()

	const totalUsers = 1 + fakeUsers.length + otherUsers.length
	const [raisedHand, setRaisedHand] = useState(false)
	const [isChatOpen, setIsChatOpen] = useState<boolean>(false)

	const speaking = useIsSpeaking(userMedia.audioStreamTrack)

	useMount(() => {
		if (otherUsers.length > 5) {
			userMedia.turnMicOff()
		}
	})

	useBroadcastStatus({
		userMedia,
		peer,
		signal,
		identity,
		pushedTracks,
		raisedHand,
		speaking,
	})

	useSounds(otherUsers)
	useUserJoinLeaveToasts(otherUsers)

	const { width } = useWindowSize()
	const stageLimit = width < 600 ? 2 : 8

	const { recordActivity, actorsOnStage } = useStageManager(
		otherUsers,
		stageLimit
	)

	useEffect(() => {
		otherUsers.forEach((u) => {
			if (u.speaking || u.raisedHand || u.tracks.screenShareEnabled)
				recordActivity(u)
		})
	}, [otherUsers, recordActivity])

	const [pinnedId, setPinnedId] = useState<string>()

	const flexContainerWidth = useMemo(
		() =>
			100 /
				calculateLayout({
					count: totalUsers,
					height: containerHeight,
					width: containerWidth,
				}).cols +
			'%',
		[totalUsers, containerHeight, containerWidth]
	)

	console.log({ identity, actorsOnStage })
	return (
		<PullAudioTracks
			audioTracks={otherUsers.map((u) => u.tracks.audio).filter(isNonNullable)}
		>
			<div className="flex flex-col h-screen bg-gray-100">
				<Flipper
					flipKey={totalUsers}
					className="relative flex-grow overflow-hidden"
				>
					<div
						className="absolute inset-0 h-full w-full bg-gradient-to-r from-gray-700 to-gray-500 flex flex-col md:flex-row"
						ref={containerRef}
					>
						{/* Main video grid */}
						<div className="flex-grow flex items-start justify-center p-4">
							{actorsOnStage.map((user) => {
								if (user.name.startsWith('anonymous')) return null
								if (
									identity?.role === 'client' &&
									(user.name === 'whisper' || user.name === 'listener')
								)
									return null
								if (user.role === 'whisper') return null
								if (identity?.role !== 'client' && user.role !== 'client')
									return null

								return (
									<PullVideoTrack
										key={user.id}
										video={user.tracks.video}
										audio={user.tracks.audio}
									>
										{({ videoTrack, audioTrack }) => (
											<div className="w-full aspect-video">
												{/* <h1>ini main video grid</h1> */}
												<Participant
													user={user}
													flipId={user.id}
													videoTrack={videoTrack}
													audioTrack={audioTrack}
													pinnedId={pinnedId}
													setPinnedId={setPinnedId}
												/>
											</div>
										)}
									</PullVideoTrack>
								)
							})}
						</div>

						{/* Sidebar for self-view and additional participants */}
						<div className="flex flex-row md:flex-col md:w-64 p-4 space-y-0 space-x-4 md:space-x-0 md:space-y-4 overflow-x-auto md:overflow-y-auto">
							{identity &&
								identity.name !== 'anonymous_$43567243567u' &&
								userMedia.audioStreamTrack && (
									<div className="flex-shrink-0 w-48 md:w-full aspect-video rounded-lg overflow-hidden shadow-lg">
										{/* <h1>ini identity</h1> */}
										<Participant
											user={identity}
											isSelf
											flipId={'identity user'}
											ref={firstFlexChildRef}
											videoTrack={userMedia.videoStreamTrack}
											audioTrack={userMedia.audioStreamTrack}
											pinnedId={pinnedId}
											setPinnedId={setPinnedId}
										/>
									</div>
								)}
							{otherUsers
								.filter(
									(item) => item.role !== 'client' && item.role === 'whisper'
								)
								.map((item) => {
									if (identity?.role === 'client' && item.role === 'whisper')
										return null
									return (
										<div
											key={item.id}
											className="flex-shrink-0 w-48 md:w-full aspect-video rounded-lg overflow-hidden shadow-lg"
										>
											{/* <h1>ini other user</h1> */}
											<Participant
												user={item}
												isSelf
												flipId={'identity user'}
												ref={firstFlexChildRef}
												videoTrack={userMedia.videoStreamTrack}
												audioTrack={userMedia.audioStreamTrack}
												pinnedId={pinnedId}
												setPinnedId={setPinnedId}
											/>
										</div>
									)
								})}
						</div>
					</div>
					<Toast.Viewport />
				</Flipper>

				{/* Bottom control bar */}
				<div className="bg-white shadow-lg p-4">
					<div className="max-w-7xl mx-auto flex items-center justify-between">
						<div className="flex items-center space-x-2 justify-center flex-grow">
							<MicButton warnWhenSpeakingWhileMuted />
							<CameraButton />
							{(identity?.role === 'agent' || identity?.role === 'whisper') && (
								<Button
									onClick={() => setIsChatOpen(!isChatOpen)}
									className="relative"
								>
									<Icon
										type="ChatBubble"
										className={isChatOpen ? 'text-blue-500' : ''}
									/>
									{isChatOpen && (
										<span className="absolute top-0 right-0 block h-2 w-2 rounded-full ring-2 ring-white bg-red-400" />
									)}
								</Button>
							)}
							<OverflowMenu bugReportsEnabled={bugReportsEnabled} />
							<LeaveRoomButton endpoint={`/api/endcall/${roomId}`} />
						</div>
					</div>
				</div>
			</div>
			<HighPacketLossWarningsToast />
			<IceDisconnectedToast />
			{isChatOpen && (
				<FloatingChat
					isOpen={isChatOpen}
					onClose={() => setIsChatOpen(false)}
					onOpen={() => setIsChatOpen(true)}
				/>
			)}
		</PullAudioTracks>
	)
}
