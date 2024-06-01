import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import type { LoaderFunctionArgs } from '@remix-run/cloudflare'
import { json, redirect } from '@remix-run/cloudflare'
import { useLoaderData, useNavigate, useParams, useRevalidator, useSubmit } from '@remix-run/react'
import moment from 'moment'
import { useEffect } from 'react'
import { useInterval } from 'react-use'
import invariant from 'tiny-invariant'
import { AudioIndicator } from '~/components/AudioIndicator'
import { Button } from '~/components/Button'
import { CameraButton } from '~/components/CameraButton'
import { CopyButton } from '~/components/CopyButton'
import { Disclaimer } from '~/components/Disclaimer'
import { Icon } from '~/components/Icon/Icon'
import { MicButton } from '~/components/MicButton'

import { SelfView } from '~/components/SelfView'
import { SettingsButton } from '~/components/SettingsDialog'
import { Tooltip } from '~/components/Tooltip'
import { useRoomContext } from '~/hooks/useRoomContext'
import { errorMessageMap } from '~/hooks/useUserMedia'
import getClientToken, { removeClientToken } from '~/utils/getClientToken.server'
import getDoctorToken from '~/utils/getDoctorToken.server'
import getUsername from '~/utils/getUsername.server'


export const loader = async ({ request, params, context }: LoaderFunctionArgs) => {
	const username = await getUsername(request)
	const trxClientToken = await getClientToken(request)
	let doctorToken = await getDoctorToken(request);
	console.log('doctorToken', doctorToken);
	const roomName = params.roomName
	
	invariant(username)
	const host = context.URL_API;
	// let doctorToken = await getDoctorToken(request);
	console.log('trxClientToken', trxClientToken);
	// console.log('doctorToken User', doctorToken);
	if(doctorToken)
		throw redirect('/doctor/dashboard');
	else
		throw redirect('/set-username');
	
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
	let data:any  = await response.json();
	console.log('data', data)
	if(!data.success) {
		return removeClientToken(request, `/set-username`)
	}
	let datares = data.data;
	let trxWaitingDate = (datares.trxcall.trxWaitingDate) ? datares.trxcall.trxWaitingDate : datares.trxcall.trxDate;
	if(!datares.trxcall.trxWaitingDate) {
		// update timer
		const responsetimer = await fetch(`${host}/trxcall/waitingtimer`, {
			method: 'post',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				trxClientToken: trxClientToken,
			})
		})
		let datatimer:any  = await responsetimer.json();
		let datatimerres = datatimer.data;
		trxWaitingDate = datatimerres.trxcall.trxWaitingDate;
	}

	const trxCallStatus = datares.trxcall.trxCallStatus;
	
	// if(trxCallStatus == 99) {
	// 	return removeClientToken(request, `/set-username`)
	// }
	// if(isconfirm) {
	// 	return removeClientToken(request, `/set-username`)
	// }
	let now = moment(new Date()); //todays date
	let end = trxWaitingDate; // another date
	// console.log('now', now)
	// console.log('end', end)
	console.log('trxWaitingDate', trxWaitingDate);
	let duration = moment.duration(now.diff(end));
	console.log('duration', duration);
	// let durationMin = moment.duration(end.diff(now));
	// let secondsMin = Math.floor(durationMin.asSeconds());
	let seconds = Math.floor(duration.asSeconds());
	let maxsecond = 30 - seconds;

	console.log('seconds', seconds)
	console.log('maxsecond', maxsecond-seconds)
	if(seconds > 30) {
		const response = await fetch(`${host}/trxcall/leave`, {
			method: 'post',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				trxClientToken: trxClientToken,
			})
		})
		let data:any = await response.json();
		console.log('data', data)
		// return data;
		if(!data.success) {
			throw new Response(data.message, {status: 500});
		}
		// clear session
		let url = '/set-username';
		// return url;
		return removeClientToken(request, url);
	}
	return json({ username, trxClientToken, doctorToken, datares, seconds, maxsecond })
}


export default function Lobby() {
	const {trxClientToken, doctorToken, datares, seconds, maxsecond} = useLoaderData<typeof loader>();
	const submit = useSubmit();
	console.log('datares', datares)
	const doctorName = datares.doctorName;
	const trxCallStatus = datares.trxcall.trxCallStatus;
	
	const { roomName } = useParams()
	const navigate = useNavigate()
	const { setJoined, userMedia, room } = useRoomContext()
	const { videoStreamTrack, audioStreamTrack, audioEnabled } = userMedia

	const joinedUsers = new Set(
		room.otherUsers.filter((u) => u.tracks.audio).map((u) => u.name)
	).size

	const audioUnavailableMessage = userMedia.audioUnavailableReason
		? errorMessageMap[userMedia.audioUnavailableReason]
		: null
		
	const revalidator = useRevalidator();
	let intervalID: any = null;
	useEffect(() => {
		// console.log('room', roomName)
		// console.log('trxCallStatus', trxCallStatus)
		// console.log('seconds', seconds)
		if(trxCallStatus == 0 && seconds < 30) {
			intervalID = setInterval(() => {
				if (revalidator.state === "idle") {
					revalidator.revalidate();
				}
			}, 1000)
		}

		if(trxCallStatus == 1) {
			clearInterval(intervalID)
			setTimeout(function() {
				setJoined(true)
				// we navigate here with javascript instead of an a
				// tag because we don't want it to be possible to join
				// the room without the JS having loaded
				navigate('room')	
			}, 1000);
			
		}
		console.log('seconds', seconds);
		if (seconds >= 30 || maxsecond <= 0) {
			const a = window.confirm('Mohon maaf tenaga medis belum tersedia untuk saat ini. Silahkan coba beberapa saat lagi.');
			
			navigate(`/${roomName}`);
		}
		
		console.log('trxCallStatus', trxCallStatus);
		if(trxCallStatus == 99) {
			const a = window.confirm('Mohon maaf tenaga medis belum tersedia untuk saat ini. Silahkan coba beberapa saat lagi.');
			navigate(`/set-username`);
		}
		return () => clearInterval(intervalID);
	}, [revalidator]);

	return (
		<div className="flex flex-col items-center justify-center p-4">
			<div className="flex-1"></div>
			<div className="space-y-4 w-5/12">
				
				{/* <div> */}
					{/* <h1 className="text-3xl font-bold">{roomName}</h1> */}
					{!doctorToken ? (<h1 className="text-3xl">Contacting to <b>{doctorName}</b>... ({maxsecond} detik)</h1>) : ''}
					
					{/* <p className="text-sm text-zinc-500 dark:text-zinc-400">
						{`${joinedUsers} ${
							joinedUsers === 1 ? 'user' : 'users'
						} in the room.`}{' '}
					</p> */}
				{/* </div> */}
				<div className="relative">
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
				<div className="flex gap-4 text-sm">
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
					{/* <CopyButton></CopyButton> */}
				</div>
			</div>
			{/* <div className="flex flex-col justify-end flex-1">
				<Disclaimer className="pt-6" />
			</div> */}
		</div>
	)
}
