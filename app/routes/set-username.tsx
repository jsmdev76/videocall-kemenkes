import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs, json } from '@remix-run/cloudflare'
import { Form, useFetcher, useLoaderData, useSubmit } from '@remix-run/react'
import { useEffect, useState } from 'react'
import invariant from 'tiny-invariant'
import { Button } from '~/components/Button'
import { Input } from '~/components/Input'
import { ACCESS_AUTHENTICATED_USER_EMAIL_HEADER } from '~/utils/constants'
import getClientToken from '~/utils/getClientToken.server'
import getDoctorToken from '~/utils/getDoctorToken.server'
import { setUsername } from '~/utils/getUsername.server'
// import DataApi from '~/api/dataApi.server'
export const loader = async({request}: LoaderFunctionArgs) => {
	const url = new URL(request.url)
	let isfull = url.searchParams.get('isfull')
	let doctorToken = await getDoctorToken(request);
	if(doctorToken) {
		return redirect('/doctor/dashboard');
	}
	return json({isfull});
}
export const action = async ({ request, context }: ActionFunctionArgs) => {
	const host = context.URL_API;
	const url = new URL(request.url);
	const isFull = url.searchParams.get('isfull');
	// const fetcher = useFetcher();
	// const returnUrl = url.searchParams.get('return-url') ?? '/'
	// const accessUsername = request.headers.get(
	// 	ACCESS_AUTHENTICATED_USER_EMAIL_HEADER
	// )
	// if (accessUsername) throw redirect(returnUrl)
	const { username, latitude, longitude } = Object.fromEntries(await request.formData())
	invariant(typeof username === 'string')
	const roomName = crypto.randomUUID().split('-')[0];
	const response = await fetch(`${host}/trxcall`, {
		method: 'post',
		headers: {
			Accept: 'application/json',
            'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			roomName: roomName,
			clientName: username,
			latitude: latitude,
			longitude: longitude,
		})
	})
	// console.log('response', response)
	const data:any = await response.json();
	if(!data.success) {
		if(data.waiting) {
			throw redirect('/set-username?isfull=1');
		} else {
			throw new Response("Panggilan gagal. Silahkan coba beberapa saat lagi", {status: 500});
		}
	}
	// if(data)
		// console.log('data', data.data.trxcall.trxClientToken)
	// 	if(data)
	// 		console.log('data.success', data.success)
	// return data;
	const trxClientToken = data.data.trxcall.trxClientToken;
	return setUsername(username, trxClientToken, request, '/new?room='+roomName);
}

export default function SetUsername() {
	const {isfull} = useLoaderData<typeof loader>();
	const [latitude, setLatitude] = useState(1);
	const [longitude, setLongitude] = useState(1);
	const [allowAudio, setAllowAudio] = useState(1);
	// let latitude = 0;
	// let longitude = 0;
	useEffect(() => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition((position) => {
				console.log('position', position)
				if(position) {
					setLatitude(position.coords.latitude);
					setLongitude(position.coords.longitude);
				}
				console.log('latitude', latitude)
			});
		}

		if(navigator.mediaDevices) {
			navigator.mediaDevices
			.getUserMedia({
				video: true,
				audio: true,
			})
			.then((ms) => {
				ms.getTracks().forEach((t) => t.stop())
				setAllowAudio(1);
			})
			.catch(() => {
				setAllowAudio(2);
				// if (mountedRef.current) setPermissionState('denied')
				
			})
		}
		// if(allowAudio == 2) {
		// 	alert('Silahkan aktifkan microphone untuk memulai sesi.');
		// }
	}, [latitude, longitude])
	// console.log('latitude', latitude)
	// console.log(allowAudio,'allowAudio')
	return (
		<div className="grid h-full gap-4 place-content-center">
			<h1 className="text-3xl font-bold">🍊 Doctor Meets</h1>
			<Form className="flex items-end gap-4" method="post">
				<div className="grid gap-3">
					<label htmlFor="username">Enter your display name</label>
					<Input
						autoComplete="off"
						autoFocus
						required
						type="text"
						id="username"
						name="username"
					/>
					<Input type="hidden" id="latitude" name="latitude" value={latitude}/>
					<Input type="hidden" id="longitude" name="longitude" value={longitude}/>
				</div>
				<Button className="text-xs" type="submit">
					Submit
				</Button>
			</Form>
			{allowAudio == 2 ? (<div className='text-danger'>Silahkan aktifkan microphone untuk memulai sesi.</div>) : ''}
			{isfull == '1' ? (
				<div className="text-danger">Mohon maaf tenaga medis belum tersedia untuk saat ini.<br/> Silahkan coba beberapa saat lagi.</div>
			) : ('')}
		</div>
	)
}
