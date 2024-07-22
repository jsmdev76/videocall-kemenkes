import type { LoaderFunctionArgs } from '@remix-run/cloudflare'
import { json } from '@remix-run/cloudflare'
import {
	useLoaderData,
	useNavigate,
	useParams,
	useRevalidator,
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
			/>
		</Toast.Provider>
	)
}

function JoinedRoom({
	bugReportsEnabled,
	roomId,
	clientLocation,
}: {
	bugReportsEnabled: boolean
	roomId: string
	clientLocation: { latitude: string; longitude: string }
}) {
	const navigate = useNavigate()
	const {
		userMedia,
		peer,
		joined,
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
	const [callDuration, setCallDuration] = useState<string>('00:00')
	const [callStartTime, setCallStartTime] = useState<number>(Date.now())
	const [endCallTime, setEndCallTime] = useState<number>(
		Date.now() + 30 * 60000
	) //ini 30 menit

	useEffect(() => {
		const interval = setInterval(() => {
			const currentTime = Date.now();
			const elapsedTime = currentTime - callStartTime;
			const remainingTime = endCallTime - currentTime;
	  
			const minutes = Math.floor(elapsedTime / 60000);
			const seconds = Math.floor((elapsedTime % 60000) / 1000);
			
			const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
			const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
	  
			setCallDuration(`${formattedMinutes}:${formattedSeconds}`);
	  
			if (remainingTime <= 2 * 60000 && remainingTime > 0 && identity?.role === "agent") {
			  const extendCall = window.confirm("Waktu panggilan tersisa 2 menit lagi. Apakah anda ingin menambahkan lagi?");
			  if (extendCall) {
				setEndCallTime(endCallTime + 10 * 60000); // Extend call 10 min
			  } else {
				clearInterval(interval);
			  }
			}
	  
			if (remainingTime <= 0) {
			  clearInterval(interval);
			}
		  }, 1000);
	  
		  return () => clearInterval(interval);
	  
	}, [])

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

	// useEffect(() => {
	// 	const isAgent = identity?.role === 'agent';
	// 	const isClient = identity?.role === 'client';

	// 	if (isAgent || isClient) {
	// 	  const otherRole = isAgent ? 'client' : 'agent';
	// 	  const otherUser = otherUsers.find(user => user.role === otherRole);

	// 	  if (!otherUser) {
	// 		// console.log("exit")
	// 		// Jika user lain (agent/client) tidak ada, arahkan ke halaman keluar
	// 		navigate(`/end-room`);
	// 	  }
	// 	}
	//   }, [otherUsers, identity, navigate]);

	console.log(actorsOnStage)

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
					<span className="flex items-center justify-center text-gray-500 dark:text">
						{callDuration} | {identity?.name.replace('|', '')}
					</span>
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
					<Button
						onClick={() =>
							window.open(
								`http://maps.google.com/maps?q=${clientLocation.latitude},${clientLocation.longitude}`,
								'_blank'
							)
						}
					>
						Lihat Lokasi
					</Button>
				</div>
			</div>
			<HighPacketLossWarningsToast />
			<IceDisconnectedToast />
		</PullAudioTracks>
	)
}
