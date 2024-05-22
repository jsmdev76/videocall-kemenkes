import type { LoaderFunctionArgs } from '@remix-run/cloudflare'
import { json, redirect } from '@remix-run/cloudflare'
import { useLoaderData, useNavigate, useParams, useRevalidator, useSubmit } from '@remix-run/react'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Flipper } from 'react-flip-toolkit'
import { useMeasure, useMount, useWindowSize } from 'react-use'
import { Button } from '~/components/Button'
import { CameraButton } from '~/components/CameraButton'
import { HighPacketLossWarningsToast } from '~/components/HighPacketLossWarningsToast'
import { IceDisconnectedToast } from '~/components/IceDisconnectedToast'
import { Icon } from '~/components/Icon/Icon'
import { LeaveRoomButton } from '~/components/LeaveRoomButton'
import { MicButton } from '~/components/MicButton'
import { OverflowMenu } from '~/components/OverflowMenu'
import { Participant } from '~/components/Participant'
import { ParticipantsButton } from '~/components/ParticipantsMenu'
import { PullAudioTracks } from '~/components/PullAudioTracks'
import { PullVideoTrack } from '~/components/PullVideoTrack'
import { RaiseHandButton } from '~/components/RaiseHandButton'
import { ScreenshareButton } from '~/components/ScreenshareButton'
import Toast from '~/components/Toast'
import useBroadcastStatus from '~/hooks/useBroadcastStatus'
import useIsSpeaking from '~/hooks/useIsSpeaking'
import { useRoomContext } from '~/hooks/useRoomContext'
import useSounds from '~/hooks/useSounds'
import useStageManager from '~/hooks/useStageManager'
import { useUserJoinLeaveToasts } from '~/hooks/useUserJoinLeaveToasts'
import { calculateLayout } from '~/utils/calculateLayout'
import getClientToken, { removeClientToken } from '~/utils/getClientToken.server'
import getDoctorToken from '~/utils/getDoctorToken.server'
import getUsername from '~/utils/getUsername.server'
import isNonNullable from '~/utils/isNonNullable'

export const loader = async ({ request, context, params }: LoaderFunctionArgs) => {
	const username = await getUsername(request)
	const roomName = params.roomName
	const trxClientToken = await getClientToken(request)
	// // invariant(username)
	const host = context.URL_API;
	let doctorToken = await getDoctorToken(request);
	// console.log('trxClientToken', trxClientToken);
	// console.log('doctorToken', doctorToken);
	// console.log('doctorToken User', doctorToken);
	const response = await fetch(`${host}/room`, {
		method: 'post',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			roomName: roomName,
			// roomToken: trxClientToken,
		})
	})
	let data:any = await response.json();
	if(!data.success) {
		throw new Response(data.message, {status: 500});
	}
	console.log('data', data)
	const trxcall = data.data.trxcall;
	// console.log('[0,1].indexOf(trxcall.trxCallStatus)', [0,1].indexOf(trxcall.trxCallStatus))
	if(trxcall.trxCallStatus > 3) {
		console.log('doctorTokenbeff',doctorToken);
		await removeClientToken(request, `/set-username`)
		console.log('doctorTokenbeafff',doctorToken);
		if(doctorToken)
			throw redirect('/doctor');
		else
			throw redirect('/set-username');
	}

	return json({
		username,
		bugReportsEnabled: Boolean(context.FEEDBACK_QUEUE && context.FEEDBACK_URL),
		mode: context.mode,
		trxcall
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
	const { joined } = useRoomContext()
	const navigate = useNavigate()
	const submit = useSubmit()
	const { roomName } = useParams()
	const { mode, bugReportsEnabled, trxcall } = useLoaderData<typeof loader>()
	const trxCallStatus = trxcall.trxCallStatus;
	useEffect(() => {
		if (!joined && mode !== 'development') navigate(`/${roomName}`)
	}, [joined, mode, navigate, roomName])
	
	const revalidator = useRevalidator();
	let intervalID: any = null;
	useEffect(() => {
		console.log('trxCallStatus', trxCallStatus)
		if(trxCallStatus == 1) {
			intervalID = setInterval(() => {
				if (revalidator.state === "idle") {
					revalidator.revalidate();
				}
			}, 5000)
		}
		return () => clearInterval(intervalID);
		
	}, [revalidator]);

	if (!joined && mode !== 'development') return null

	return (
		<Toast.Provider>
			<JoinedRoom bugReportsEnabled={bugReportsEnabled} />
		</Toast.Provider>
	)
}

function JoinedRoom({ bugReportsEnabled }: { bugReportsEnabled: boolean }) {
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
								// the flex basis that is needed to achieve row layout
								'--flex-container-width': flexContainerWidth,
								// the size of the first user's flex container
								'--participant-max-width': firstFlexChildWidth + 'px',
							} as any
						}
						ref={containerRef}
					>
						{identity && userMedia.audioStreamTrack && (
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

						{identity &&
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
							)}
						{actorsOnStage.map((user) => (
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
										></Participant>
									)}
								</PullVideoTrack>
								{user.tracks.screenshare && user.tracks.screenShareEnabled && (
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
								)}
							</Fragment>
						))}

						{identity &&
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
								></Participant>
							))}
					</div>
					<Toast.Viewport />
				</Flipper>
				<div className="flex flex-wrap items-center justify-center gap-2 p-2 text-sm md:gap-4 md:p-5 md:text-base">
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
					></ParticipantsButton> */}
					<OverflowMenu bugReportsEnabled={bugReportsEnabled} />
					<LeaveRoomButton />
				</div>
			</div>
			<HighPacketLossWarningsToast />
			<IceDisconnectedToast />
		</PullAudioTracks>
	)
}
