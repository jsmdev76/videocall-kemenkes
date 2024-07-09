import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import type { LoaderFunctionArgs } from '@remix-run/cloudflare'
import { json, redirect } from '@remix-run/cloudflare'
import { useLoaderData, useNavigate, useParams, useRevalidator, useSubmit } from '@remix-run/react'
import { div } from '@tensorflow/tfjs-core'
import moment from 'moment'
import { useEffect, useState } from 'react'
import { useInterval } from 'react-use'
import invariant from 'tiny-invariant'
import { AudioIndicator } from '~/components/AudioIndicator'
import { Button } from '~/components/Button'
import { CameraButton } from '~/components/CameraButton'
import { CopyButton } from '~/components/CopyButton'
import { Disclaimer } from '~/components/Disclaimer'
import { Icon } from '~/components/Icon/Icon'
import { LeaveRoomButton } from '~/components/LeaveRoomButton'
import { MicButton } from '~/components/MicButton'

import { SelfView } from '~/components/SelfView'
import { SettingsButton } from '~/components/SettingsDialog'
import { Tooltip } from '~/components/Tooltip'
import { useRoomContext } from '~/hooks/useRoomContext'
import { errorMessageMap } from '~/hooks/useUserMedia'
import getClientToken, { removeClientToken, setClientToken } from '~/utils/getClientToken.server'
import getDoctorToken from '~/utils/getDoctorToken.server'
import getUsername, { setUsername } from '~/utils/getUsername.server'


export const loader = async ({ request, params, context }: LoaderFunctionArgs) => {
	const url = new URL(request.url)
	const host = context.URL_API;
	const roomName = params.roomName
	
	const response = await fetch(`${host}/call/client/${roomName}`, {
		method: 'GET',
		headers: {
		  'Content-Type': 'application/json',
		  'x-api-key': context.API_SECRET_KEY as string
		},
		// body: JSON.stringify({ roomId: roomName }),
	  });
	  const data: {success: boolean; message: string; data: {isAccepted: boolean; callStatus: number; clientName: string; agentName: string; agentId: number; callId: string}} = await response.json();

	  if (data.data.isAccepted) {
		// return redirect(`/${roomName}/room`)
		return setUsername(data.data.clientName, "client", request, `/${roomName}/room?role=client&username=${data.data.clientName}`)
	  }

	  console.log(data)

	return json({ data, host })
}


export default function Lobby() {
	const { data, host} = useLoaderData<typeof loader>();
	console.log(data)
	const submit = useSubmit();
	// console.log('datares', datares)
	// const doctorName = datares.doctorName;
	// const trxCallStatus = datares.trxcall.trxCallStatus;
	
	const { roomName } = useParams()
	const navigate = useNavigate()
	const { setJoined, userMedia, room } = useRoomContext()
	console.log(room.messages)
	const { videoStreamTrack, audioStreamTrack, audioEnabled } = userMedia

	const joinedUsers = new Set(
		room.otherUsers.filter((u) => u.tracks.audio).map((u) => u.name)
	).size

	const audioUnavailableMessage = userMedia.audioUnavailableReason
		? errorMessageMap[userMedia.audioUnavailableReason]
		: null
		
	const revalidator = useRevalidator();
	let intervalID: any = null;

	const [remainingTime, setRemainingTime] = useState<number>(60)

	useEffect(() => {
		const handleStatusAndNavigation = async () => {
			if (data.data.callStatus === 1 && remainingTime < 60) {
				alert(data.message);
				navigate(`/${roomName}/room`);
			} else if (data.data.callStatus === 3 && remainingTime > 0) {
				alert(data.message);
				navigate('/set-username');
			} else if (remainingTime <= 0) {
				alert('Mohon maaf tenaga medis belum tersedia untuk saat ini. Silahkan coba beberapa saat lagi.');
				try {
					const response = await fetch(`/api/cancelcall/${data.data.callId}`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
					});
					console.log(response)
					if (response.ok) {
						navigate('/set-username');
					} else {
						throw new Error('Gagal membatalkan panggilan');
					}
				} catch (error) {
					console.error('Error:', error);
					// Handle error scenario if needed
				}
				return;
			}
		};
	
		const timerId = setInterval(async () => {
			handleStatusAndNavigation();
			setRemainingTime(prevTime => prevTime - 1);
			if (revalidator.state === "idle") {
				revalidator.revalidate();
			}
		}, 1000);
	
		return () => clearInterval(timerId);
	}, [remainingTime, navigate, data, roomName, host, revalidator]);
	


	return (
		<div className="flex flex-col items-center justify-center p-4 video-box">
			<div className="flex-1"></div>
			<div className="space-y-4 w-5/12">
				
				{/* <div> */}
					{/* <h1 className="text-3xl font-bold">{roomName}</h1> */}
					
					{data.data && (
						<div className='wording-call-box'>
							<div className="call-icon"></div>
							<h1 className="text-3xl">Menghubungkan anda dengan konselor <br></br> <b>{data.data.agentName}</b>...</h1>
							<div className="loader-icon"></div>
							<p>({remainingTime} detik)</p>
						</div>
					)}
					
					{/* <p className="text-sm text-zinc-500 dark:text-zinc-400">
						{`${joinedUsers} ${
							joinedUsers === 1 ? 'user' : 'users'
						} in the room.`}{' '}
					</p> */}
				{/* </div> */}
				<div className="relative video-index-box">
					<SelfView
						className="aspect-[4/3] w-full"
						videoTrack={videoStreamTrack}
					/>
					{audioStreamTrack && (
						<div className="absolute left-3 top-3">
							{audioEnabled ? (
								<AudioIndicator audioTrack={audioStreamTrack} />
							) : (
								<Tooltip content="Mic is turned off">
									<div className="text-white indication-shadow">
										<Icon type="micOff" />
										<VisuallyHidden>Mic is turned off</VisuallyHidden>
									</div>
								</Tooltip>
							)}
						</div>
					)}
				</div>
				{(userMedia.audioUnavailableReason ||
					userMedia.videoUnavailableReason) && (
					<div className="p-3 rounded-md text-zinc-800 bg-zinc-200 dark:text-zinc-200 dark:bg-zinc-700">
						{userMedia.audioUnavailableReason === 'NotAllowedError' &&
							userMedia.videoUnavailableReason === undefined && (
								<p>Mic permission was denied.</p>
							)}
						{userMedia.videoUnavailableReason === 'NotAllowedError' &&
							userMedia.audioUnavailableReason === undefined && (
								<p>Camera permission was denied.</p>
							)}
						{userMedia.audioUnavailableReason === 'NotAllowedError' &&
							userMedia.videoUnavailableReason === 'NotAllowedError' && (
								<p>Mic and camera permissions were denied.</p>
							)}
						{userMedia.audioUnavailableReason === 'NotAllowedError' && (
							<p>
								Enable permission
								{userMedia.audioUnavailableReason &&
								userMedia.videoUnavailableReason
									? 's'
									: ''}{' '}
								and reload the page to join.
							</p>
						)}
					</div>
				)}
				<div className="flex gap-4 text-sm tool-call-box justify-center">
					{/* {audioUnavailableMessage ? (
						<Tooltip content="Unable to join without a mic.">
							<Button disabled>Join</Button>
						</Tooltip>
					) : (
						<Button
							onClick={() => {
								setJoined(true)
								// we navigate here with javascript instead of an a
								// tag because we don't want it to be possible to join
								// the room without the JS having loaded
								navigate('room')
							}}
						>
							Join
						</Button>
					)} */}
					<MicButton />
					<CameraButton />
					<SettingsButton />
					<LeaveRoomButton endpoint={`/api/cancelcall/${data.data.callId}`} />
					{/* <CopyButton></CopyButton> */}
				</div>
			</div>
			{/* <div className="flex flex-col justify-end flex-1">
				<Disclaimer className="pt-6" />
			</div> */}
		</div>
	)
}
