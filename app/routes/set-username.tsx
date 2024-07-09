import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare'
import { Form, useActionData, useLoaderData, useNavigation } from '@remix-run/react'
import { useEffect, useState } from 'react'
import invariant from 'tiny-invariant'
import { Button } from '~/components/Button'
import { Input } from '~/components/Input'
import { setUsername } from '~/utils/getUsername.server'
// import DataApi from '~/api/dataApi.server'


export const loader = async ({ request, context }: LoaderFunctionArgs) => {
	const url = new URL(request.url)
	let username = url.searchParams.get('username')
	// let doctorToken = await getDoctorToken(request)
	// if (doctorToken) {
	// 	return redirect('/doctor/dashboard')
	// }
	return json({ username })
}


export const action = async ({ request, context }: ActionFunctionArgs) => {
	const host = context.URL_API
	const url = new URL(request.url)
	const { username, latitude, longitude } = Object.fromEntries(
		await request.formData()
	)
	invariant(typeof username === 'string')
	const roomName = crypto.randomUUID().split('-')[0]
	const response = await fetch(`${host}/call/create`, {
		method: 'post',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'x-api-key': context.API_SECRET_KEY as string
		},
		body: JSON.stringify({
			url: `${url.origin}/${roomName}/room`,
			roomId: roomName,
			clientName: username,
			latitude: latitude,
			longitude: longitude,
		}),
	})
	console.log('response', response)
	const data: { message: string; success: boolean } = await response.json()
	// if (!data.success) {
	// 	if (data.waiting) {
	// 		throw redirect('/set-username?isfull=1')
	// 	} else {
	// 		throw new Response('Panggilan gagal. Silahkan coba beberapa saat lagi', {
	// 			status: 500,
	// 		})
	// 	}
	// }
	// if(data)
	// console.log('data', data.data.trxcall.trxClientToken)
	// 	if(data)
	// 		console.log('data.success', data.success)
	// return data;
	// const trxClientToken = data.data.trxcall.trxClientToken
	if (data.success) {
		return setUsername(username, "client", request, `/${roomName}`)
		// return redirect(`/${roomName}`)
	} else {
		return json({ username, data })
	}
	// return setUsername(username, trxClientToken, request, '/new?room=' + roomName)
}

export default function SetUsername() {
	const { username } = useLoaderData<typeof loader>()
	const data = useActionData<typeof action>()
	console.log('hi ini data', data)
	// const [data, setData] = useState()
	const [latitude, setLatitude] = useState<string>('')
	const [longitude, setLongitude] = useState<string>('')
	const [allowAudio, setAllowAudio] = useState(1)
	const [callStatus, setCallStatus] = useState('idle')
	const [isFull, setIsFull] = useState(false)

	const navigation = useNavigation()
	// let latitude = 0;
	// let longitude = 0;
	useEffect(() => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition((position) => {
				console.log('position', position)
				if (position) {
					setLatitude(String(position.coords.latitude))
					setLongitude(String(position.coords.longitude))
				}
				console.log('latitude', latitude)
			})
		}

		if (navigator.mediaDevices) {
			navigator.mediaDevices
				.getUserMedia({
					video: true,
					audio: true,
				})
				.then((ms) => {
					ms.getTracks().forEach((t) => t.stop())
					setAllowAudio(1)
				})
				.catch(() => {
					setAllowAudio(2)
					// if (mountedRef.current) setPermissionState('denied')
				})
		}
		// if(allowAudio == 2) {
		// 	alert('Silahkan aktifkan microphone untuk memulai sesi.');
		// }
	}, [latitude, longitude, data, navigation])
	// console.log('latitude', latitude)
	// console.log(allowAudio,'allowAudio')

	return (
		<div className="grid h-full gap-4 place-content-center bg-login">
			<div className="bg-kemenkes box-logo"></div>
			<h1 className="text-3xl font-bold text-blue">Konsultasi</h1>
			<p className="text-blue">
				Anda akan terhubung ke layanan konseling 24 jam dengan durasi 30 menit
				per sesi. <br />
				Izinkan akses lokasi agar konselor dapat memberikan pelayanan yang
				optimal.{' '}
			</p>
			<Form className="flex items-end gap-4" method="post">
				<div className="grid gap-3">
					<label htmlFor="username" className="text-blue">
						Masukkan nama Anda untuk memulai
					</label>
					<Input
						autoComplete="off"
						autoFocus
						required
						type="text"
						id="username"
						name="username"
						defaultValue={username || ""}
					/>
					<Input type="hidden" id="latitude" name="latitude" value={latitude} />
					<Input
						type="hidden"
						id="longitude"
						name="longitude"
						value={longitude}
					/>
				</div>
				{navigation.state === 'idle' ? (
					<Button className="text-xs bg-blue" type="submit">
						Hubungi Konselor
					</Button>
				) : (
					'Menghubungi Konselor...'
				)}
			</Form>
			{allowAudio == 2 ? (
				<div className="text-danger">
					Silahkan aktifkan microphone untuk memulai sesi.
				</div>
			) : (
				''
			)}
			{/* {isfull == '1' ? (
				<div className="text-danger">
					Mohon maaf tenaga medis belum tersedia untuk saat ini.
					<br /> Silahkan coba beberapa saat lagi.
				</div>
			) : (
				''
			)} */}
			{data?.data.message === 'No available agent found' && (
				<div className="text-danger">
					Mohon maaf tenaga medis belum tersedia untuk saat ini.
					<br /> Silahkan coba beberapa saat lagi.
				</div>
			)}
		</div>
	)
}
