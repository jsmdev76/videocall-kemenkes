import type { LoaderFunctionArgs } from '@remix-run/cloudflare'
import { json } from '@remix-run/cloudflare'
import { Outlet, useLoaderData, useParams } from '@remix-run/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import invariant from 'tiny-invariant'
import { EnsureOnline } from '~/components/EnsureOnline'
import { EnsurePermissions } from '~/components/EnsurePermissions'
import { Icon } from '~/components/Icon/Icon'

import useScreenRecorder from '~/hooks/useScreenRecorder'
import { usePeerConnection } from '~/hooks/usePeerConnection'
import usePushedTrack from '~/hooks/usePushedTrack'
import useRoom from '~/hooks/useRoom'
import type { RoomContextType } from '~/hooks/useRoomContext'
import useUserMedia from '~/hooks/useUserMedia'
import { getIceServers } from '~/utils/getIceServers.server'

function numberOrUndefined(value: unknown): number | undefined {
	const num = Number(value)
	return isNaN(num) ? undefined : num
}

export const loader = async ({ context }: LoaderFunctionArgs) => {
	const {
		mode,
		TRACE_LINK,
		API_EXTRA_PARAMS,
		MAX_WEBCAM_FRAMERATE,
		MAX_WEBCAM_BITRATE,
		MAX_WEBCAM_QUALITY_LEVEL,
	} = context

	return json({
		mode,
		userDirectoryUrl: context.USER_DIRECTORY_URL,
		traceLink: TRACE_LINK,
		apiExtraParams: API_EXTRA_PARAMS,
		iceServers: await getIceServers(context),
		feedbackEnabled:
			context.FEEDBACK_QUEUE !== undefined &&
			context.FEEDBACK_URL !== undefined,
		maxWebcamFramerate: numberOrUndefined(MAX_WEBCAM_FRAMERATE),
		maxWebcamBitrate: numberOrUndefined(MAX_WEBCAM_BITRATE),
		maxWebcamQualityLevel: numberOrUndefined(MAX_WEBCAM_QUALITY_LEVEL),
	})
}

export default function RoomWithPermissions() {
	return (
		<EnsurePermissions>
			<EnsureOnline
				fallback={
					<div className="grid h-full place-items-center">
						<div>
							<h1 className="flex items-center gap-3 text-3xl font-black">
								<Icon type="SignalSlashIcon" />
								You are offline
							</h1>
						</div>
					</div>
				}
			>
				<Room />
			</EnsureOnline>
		</EnsurePermissions>
	)
}

function tryToGetDimensions(videoStreamTrack?: MediaStreamTrack) {
	if (
		videoStreamTrack === undefined ||
		// TODO: Determine a better way to get dimensions in Firefox
		// where this isn't API isn't supported. For now, Firefox will
		// just not be constrained and scaled down by dimension scaling
		// but the bandwidth and framerate constraints will still apply
		// https://caniuse.com/?search=getCapabilities
		videoStreamTrack.getCapabilities === undefined
	) {
		return { height: 0, width: 0 }
	}
	const height = videoStreamTrack?.getCapabilities().height?.max ?? 0
	const width = videoStreamTrack?.getCapabilities().width?.max ?? 0

	return { height, width }
}

function Room() {
	const [joined, setJoined] = useState(false)
	const { roomName } = useParams()
	invariant(roomName)
	const {
		blobUrl,
		pauseRecording,
		resetRecording,
		resumeRecording,
		startRecording,
		status,
		stopRecording,
	} = useScreenRecorder({ audio: true })
	const videoRef = useRef<HTMLVideoElement | null>(null)

	const {
		mode,
		userDirectoryUrl,
		traceLink,
		feedbackEnabled,
		apiExtraParams,
		iceServers,
		maxWebcamBitrate = 1_200_000,
		maxWebcamFramerate = 24,
		maxWebcamQualityLevel = 1080,
	} = useLoaderData<typeof loader>()

	const userMedia = useUserMedia(mode)
	const room = useRoom({ roomName, userMedia })
	const { peer, debugInfo, iceConnectionState } = usePeerConnection({
		apiExtraParams,
		iceServers,
	})

	const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
	const mediaRecorderRef = useRef<MediaRecorder | null>(null)

	// useEffect(() => {
	// 	const startRecording = async () => {
	// 	  try {
	// 		const combinedStream = new MediaStream([
	// 		  ...(userMedia.videoStreamTrack ? [userMedia.videoStreamTrack] : []),
	// 		  ...(userMedia.audioStreamTrack ? [userMedia.audioStreamTrack] : []),
	// 		]);
	// 		const options = { mimeType: 'video/webm; codecs=vp8' };
	// 		const recorder = new MediaRecorder(combinedStream, options);
	// 		recorder.ondataavailable = (event) => {
	// 		  if (event.data.size > 0) {
	// 			console.log('data vid',event)
	// 			setRecordedChunks((prev) => [...prev, event.data]);
	// 		  }
	// 		};
	// 		recorder.onstop = () => {
	// 		  const blob = new Blob(recordedChunks, { type: 'video/webm' });
	// 		  const url = URL.createObjectURL(blob);
	// 		  const a = document.createElement('a');
	// 		  a.href = url;
	// 		  a.download = `${roomName}_meeting_recording.webm`;
	// 		  document.body.appendChild(a);
	// 		  a.click();
	// 		  setTimeout(() => {
	// 			URL.revokeObjectURL(url);
	// 			document.body.removeChild(a);
	// 		  }, 100);
	// 		  setRecordedChunks([]);
	// 		};
	// 		mediaRecorderRef.current = recorder;
	// 		recorder.start();
	// 		console.log('Meeting recording started');
	// 	  } catch (err) {
	// 		console.error('Error starting meeting recording:', err);
	// 	  }
	// 	};
	// 	const stopRecording = () => {
	// 	  if (mediaRecorderRef.current) {
	// 		mediaRecorderRef.current.stop();
	// 		console.log('Meeting recording stopped');
	// 	  }
	// 	};
	// 	if (joined) {
	// 	  startRecording();
	// 	}
	// 	return () => {
	// 	  stopRecording();
	// 	};
	// }, [joined, roomName, userMedia.videoStreamTrack, userMedia.audioStreamTrack])

	console.log({"aw":room.roomState.users})

	const scaleResolutionDownBy = useMemo(() => {
		const videoStreamTrack = userMedia.videoStreamTrack
		const { height, width } = tryToGetDimensions(videoStreamTrack)
		const smallestDimension = Math.min(height, width)
		return Math.max(smallestDimension / maxWebcamQualityLevel, 1)
	}, [maxWebcamQualityLevel, userMedia.videoStreamTrack])

	const pushedVideoTrack = usePushedTrack(peer, userMedia.videoStreamTrack, {
		maxFramerate: maxWebcamFramerate,
		maxBitrate: maxWebcamBitrate,
		scaleResolutionDownBy,
	})
	const pushedAudioTrack = usePushedTrack(peer, userMedia.audioStreamTrack, {
		priority: 'high',
	})
	const pushedScreenSharingTrack = usePushedTrack(
		peer,
		userMedia.screenShareVideoTrack
	)

	const context: RoomContextType = {
		joined,
		setJoined,
		traceLink,
		userMedia,
		userDirectoryUrl,
		feedbackEnabled,
		peer,
		peerDebugInfo: debugInfo,
		iceConnectionState,
		room,
		pushedTracks: {
			video: pushedVideoTrack,
			audio: pushedAudioTrack,
			screenshare: pushedScreenSharingTrack,
		},
	}

	return (
			<Outlet context={context} />
	)
}
