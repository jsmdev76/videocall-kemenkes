import type { LoaderFunctionArgs } from '@remix-run/cloudflare'
import { json } from '@remix-run/cloudflare'
import {
	useLoaderData,
	useNavigate,
	useParams,
	useRevalidator,
	useSubmit,
} from '@remix-run/react'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
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

interface IDataRoomServer {
	success: boolean
	message: string
	data: {
		isActive: boolean
		roomId: string
		callStatus: number
		participant: {
			client: string
			agent: string
			agentId: number
		}
		callId: number
		clientLocation: string
		startedAt: string
	}
}

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
				'x-api-key': context.API_SECRET_KEY as string,
			},
			body: JSON.stringify({
				roomId: roomName,
				action: 'accept',
				startAt: new Date(),
			}),
		})
		let data: any = await response.json()
	}

	console.log({ role, username, roomName })
	// const trxClientToken = await getClientToken(request)
	// const doctorToken = await getDoctorToken(request)
	// const clientToken = await getUsername(request)

	const response = await fetch(`${host}/call/room/${roomName}`, {
		method: 'get',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': context.API_SECRET_KEY as string,
		},
		// body: JSON.stringify({
		// 	roomName: roomName,
		// 	isDoctor: doctorToken ? true : false,
		// }),
	})

	const data: IDataRoomServer = await response.json()
	console.log('data room', data)
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

	function formatDuration(start: string, now: Date) {
		const startDate = new Date(start)
		const diffInMs = now.getTime() - startDate.getTime() // Selisih dalam milidetik
		const totalSeconds = Math.floor(diffInMs / 1000)
		const hours = Math.floor(totalSeconds / 3600)
		const minutes = Math.floor((totalSeconds % 3600) / 60)
		const seconds = totalSeconds % 60

		return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
	}

	console.log({
		start: data.data.startedAt,
		now: new Date(),
		res: formatDuration(data.data.startedAt, new Date()),
	})

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
				clientLocation={JSON.parse(data.data.clientLocation)}
				data={data}
			/>
		</Toast.Provider>
	)
}

function JoinedRoom({
	bugReportsEnabled,
	roomId,
	clientLocation,
	data,
}: {
	bugReportsEnabled: boolean
	roomId: string
	clientLocation: { latitude: string; longitude: string }
	data: IDataRoomServer
}) {
	const navigate = useNavigate()
	const submit = useSubmit()
	const {
		userMedia,
		peer,
		joined,
		pushedTracks,
		// room: { otherUsers, signal, identity, callDuration, callExtended, extendCallDuration },
		room: { otherUsers, signal, identity, callDuration, callExtended },
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
	const [isExtended, setIsExtended] = useState<boolean>(false)
	const callStartTime = new Date(data.data.startedAt).getTime()

	const formatDuration = (seconds: number) => {
		const h = Math.floor(seconds / 3600)
		const m = Math.floor((seconds % 3600) / 60)
		const s = Math.floor(seconds % 60)
		return `${h.toString().padStart(2, '0')}:${m
			.toString()
			.padStart(2, '0')}:${s.toString().padStart(2, '0')}`
	}

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

	const handleExtendTime = async () => {
		// submit({}, { method: 'post', action: `/api/extendcall?roomId=${roomId}` })
		setIsExtended(true)
		// extendCallDuration(10*60)
	}

	useEffect(() => {
		if (callDuration <= 0) {
			submit({}, { method: 'post', action: `/api/endcall/${roomId}` })
		}
	},[callDuration])

	return (
		<PullAudioTracks
			audioTracks={otherUsers.map((u) => u.tracks.audio).filter(isNonNullable)}
		>
			<div className="flex flex-col h-full bg-white dark:bg-zinc-800">
				<Flipper
					flipKey={totalUsers}
					className="relative flex-grow overflow-hidden isolate"
				>
					<div
						className="absolute inset-0 h-full w-full bg-black isolate flex flex-wrap justify-around gap-[--gap] p-[--gap]"
						style={
							{
								'--gap': '1rem',
								'--flex-container-width': flexContainerWidth,
								// '--participant-max-width': firstFlexChildWidth + 'px',
							} as any
						}
						ref={containerRef}
					>
						{/* <Participant
									user={{name: "a", id: "id", role:"role", raisedHand: false, speaking: false, joined: true, tracks: {}}}
									isSelf
									flipId={'identity user'}
									ref={firstFlexChildRef}
									videoTrack={userMedia.videoStreamTrack}
									audioTrack={userMedia.audioStreamTrack}
									pinnedId={pinnedId}
									setPinnedId={setPinnedId}
								/> */}
						{/* {identity && userMedia.audioStreamTrack && (
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
						)} */}
						{identity &&
							identity.name !== 'anonymous_$43567243567u' &&
							userMedia.audioStreamTrack && (
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
							)}

						{/* {identity &&
							userMedia.screenShareVideoTrack &&
							userMedia.screenShareEnabled && (
								<Participant
									user={identity}
									flipId={'identity user screenshare'}
									isSelf
									isScreenShare
									videoTrack={userMedia.screenShareVideoTrack}
									pinnedId={pinnedId}
									setPinnedId={setPinnedId}
								/>
							)} */}
						{actorsOnStage.map((user) => {
							if (user.name.startsWith('anonymous')) return null
							if (
								identity?.role === 'client' &&
								(user.name === 'whisper' || user.name === 'listener')
							)
								return null

							return (
								<Fragment key={user.id}>
									<PullVideoTrack
										video={user.tracks.video}
										audio={user.tracks.audio}
									>
										{({ videoTrack, audioTrack }) => (
											<Participant
												user={user}
												flipId={user.id}
												videoTrack={videoTrack}
												audioTrack={audioTrack}
												pinnedId={pinnedId}
												setPinnedId={setPinnedId}
											/>
										)}
									</PullVideoTrack>
									{/* {user.tracks.screenshare && user.tracks.screenShareEnabled && (
									<PullVideoTrack video={user.tracks.screenshare}>
										{({ videoTrack }) => (
											<Participant
												user={user}
												videoTrack={videoTrack}
												flipId={user.id + 'screenshare'}
												isScreenShare
												pinnedId={pinnedId}
												setPinnedId={setPinnedId}
											/>
										)}
									</PullVideoTrack>
								)} */}
								</Fragment>
							)
						})}

						{/* {isListener || identity?.role === "agent" && (
							<Participant
								user={{
									id: 'listener',
									joined: true,
									name: 'Listener',
									role: 'listener',
									raisedHand: false,
									speaking: false,
									tracks: {},
								}}
								isSelf={false}
								flipId="listener"
								pinnedId={pinnedId}
								setPinnedId={setPinnedId}
							/>
						)} */}
						{/* {listener && (
							<Participant
								user={{
									id: 'listener',
									joined: false,
									name: 'Listener',
									role: 'listener',
									raisedHand: false,
									speaking: false,
									tracks: {},
								}}
								isSelf={false}
								key={listener}
								flipId={listener}
								pinnedId={pinnedId}
								setPinnedId={setPinnedId}
							/>
						)} */}

						{/* {identity &&
							userMedia.audioStreamTrack &&
							userMedia.videoStreamTrack &&
							fakeUsers.map((uid) => (
								<Participant
									user={identity}
									isSelf
									videoTrack={userMedia.videoStreamTrack}
									audioTrack={userMedia.audioStreamTrack}
									key={uid}
									flipId={uid.toString()}
									pinnedId={pinnedId}
									setPinnedId={setPinnedId}
								/>
							))} */}
					</div>
					<Toast.Viewport />
				</Flipper>
				<div className="flex flex-wrap items-center justify-between gap-2 p-2 text-sm md:gap-4 md:p-5 md:text-base tool-incall-box">
					<div className="flex items-center gap-2">
						<span className="text-white">
							{formatDuration(callDuration)} | {identity?.name.replace('|', '')}
						</span>
						{identity?.role === 'agent' && !isExtended && (
							<button
								className="bg-gray-900 rounded-lg shadow-md px-6 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
								onClick={handleExtendTime}
							>
								Extend Time
							</button>
						)}
					</div>
					<div className="flex items-center gap-2">
						{otherUsers.find(
							(item) =>
								(item.role === 'whisper' || item.role === 'agent') &&
								(identity?.role === 'agent' || identity?.role === 'whisper')
						) ? (
							<>
								<Button
									displayType="chat"
									className="bg-blue-600"
									onClick={() => setIsChatOpen(!isChatOpen)}
								>
									<Icon type={'ChatBubble'} />
								</Button>
								<FloatingChat
									isOpen={isChatOpen}
									onClose={() => setIsChatOpen(false)}
									onOpen={() => setIsChatOpen(true)}
								/>
							</>
						) : null}
						<GridDebugControls />
						<MicButton warnWhenSpeakingWhileMuted />
						<CameraButton />
						{/* <ScreenshareButton />
                    <RaiseHandButton
                        raisedHand={raisedHand}
                        onClick={() => setRaisedHand(!raisedHand)}
                    />
                    <ParticipantsButton
                        identity={identity}
                        otherUsers={otherUsers}
                        className="hidden md:block"
                    /> */}
						<OverflowMenu bugReportsEnabled={bugReportsEnabled} />
						<LeaveRoomButton endpoint={`/api/endcall/${roomId}`} />
					</div>
					<div>
						{identity?.role === 'agent' && (
							<button
								onClick={() =>
									window.open(
										`http://maps.google.com/maps?q=${clientLocation.latitude},${clientLocation.longitude}`,
										'_blank'
									)
								}
								className="flex items-center gap-2 hover:underline px-6 py-2"
							>
								<Icon type="openNewTab" />
								Lihat Lokasi
							</button>
						)}
					</div>
				</div>
			</div>
			<HighPacketLossWarningsToast />
			<IceDisconnectedToast />
		</PullAudioTracks>
	)
}
