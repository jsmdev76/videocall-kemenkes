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
import getClientToken from '~/utils/getClientToken.server'
import getDoctorToken from '~/utils/getDoctorToken.server'
import getUsername from '~/utils/getUsername.server'

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const username = await getUsername(request)
	const trxClientToken = await getClientToken(request)
	const roomName = params.roomName
	invariant(username)
	const host = 'https://e422-2001-448a-50e0-9999-7dd9-fc46-c819-36ca.ngrok-free.app';
	let doctorToken = await getDoctorToken(request);
	console.log('trxClientToken', trxClientToken);
	console.log('doctorToken', doctorToken);
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
	let data = await response.json();
	console.log('data', data)
	let datares = data.data;

	return json({ username, trxClientToken, datares })
}

let seconds = 0;
export default function Lobby() {
	const {trxClientToken, datares} = useLoaderData<typeof loader>();
	const submit = useSubmit();
	// console.log('datares', datares)
	const doctorName = datares.doctorName;
	const trxCallStatus = datares.trxcall.trxCallStatus;
	const trxCreatedDate = datares.trxcall.trxCreatedDate;

	
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
		
	let showConfirm = false
	
	let now = moment(new Date()); //todays date
	let end = trxCreatedDate; // another date
	console.log('now', now)
	console.log('end', end)
	let duration = moment.duration(now.diff(end));

	const revalidator = useRevalidator();
	useEffect(() => {
		// var days = duration.asDays();
		seconds = (duration.asSeconds());
		// console.log('days', days)
		console.log('seconds', seconds)
		// console.log('room', roomName)
		console.log('trxCallStatus', trxCallStatus)
		if(trxCallStatus != 1) {
			if(seconds == 10) {
				console.log('should leavexxxx')
				// submit({}, { method: "post", action: "/leaveroom" });
				// navigate('/set-username');
			} else {
				revalidator.revalidate();
			}
		}

		if(trxCallStatus == 1) {
			setTimeout(function() {
				setJoined(true)
				// we navigate here with javascript instead of an a
				// tag because we don't want it to be possible to join
				// the room without the JS having loaded
				navigate('room')	
			}, 1000);
			
		}
		if(trxCallStatus == 99) {
			// showConfirm = true;
		// 	navigate('/set-username')
			if(showConfirm == false) {
				showConfirm = true;
				if (window.confirm("Saat ini dokter tidak tersedia. Silahkan coba beberapa saat lagi.")) {
					navigate('/set-username')
				}
				
			}
		}
		
	}, [2000, revalidator, seconds]);
	return (
		<div className="flex flex-col items-center justify-center h-full p-4">
			<div className="flex-1"></div>
			<div className="space-y-4 w-96">
				
				<div>
					<h1 className="text-3xl font-bold">{roomName}</h1>
					<p>Contacting to <b>{doctorName}</b>... ({seconds.toFixed(0)} detik)</p>
					<p className="text-sm text-zinc-500 dark:text-zinc-400">
						{`${joinedUsers} ${
							joinedUsers === 1 ? 'user' : 'users'
						} in the room.`}{' '}
					</p>
				</div>
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
			<div className="flex flex-col justify-end flex-1">
				<Disclaimer className="pt-6" />
			</div>
		</div>
	)
}
