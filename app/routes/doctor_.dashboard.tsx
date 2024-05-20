import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs, json } from '@remix-run/cloudflare'
import { Form, Link, useFetcher, useLoaderData, useNavigate, useRevalidator, useSubmit } from '@remix-run/react'
import { useEffect } from 'react'
import { useInterval } from 'react-use'
import invariant from 'tiny-invariant'
import { Button } from '~/components/Button'
import { Input } from '~/components/Input'
import { ACCESS_AUTHENTICATED_USER_EMAIL_HEADER } from '~/utils/constants'
import getDoctorToken, { setDoctorToken } from '~/utils/getDoctorToken.server'
import { setUsername } from '~/utils/getUsername.server'
// import DataApi from '~/api/dataApi.server'
export const loader = async({request, context}: LoaderFunctionArgs) => {
	const host = context.URL_API;
	const url = new URL(request.url)
	let doctorToken = await getDoctorToken(request);
	
	console.log('doctorToken', doctorToken);
	if(!doctorToken) {
		throw redirect('/doctor');
	}
	const response = await fetch(`${host}/doctor/me`, {
		method: 'get',
		headers: {
			'Authorization': 'Bearer '+doctorToken
		}
	})
	let data:any = await response.json();
	// console.log('data', data)
	// return data;
	// if(!data.success) {
	// 	throw new Response(data.message, {status: 500});
	// }
	data = (data) ? data.data : null;
	return json({data});
}
// export const action = async ({ request }: ActionFunctionArgs) => {
// 	const host = context.URL_API;
// 	const { username, password } = Object.fromEntries(await request.formData())
// 	invariant(typeof username === 'string')
// 	invariant(typeof password === 'string')
// 	const response = await fetch(`${host}/login`, {
// 		method: 'post',
// 		headers: {
// 			'Content-Type': 'application/json'
// 		},
// 		body: JSON.stringify({
// 			username: username,
// 			password: password,
// 		})
// 	})
// 	const data:any = await response.json();
// 	if(!data.success) {
// 		throw new Response("Info doctor gagal didapat. Silahkan coba beberapa saat lagi", {status: 500});
// 	}
// 	// if(data)
// 		// console.log('data', data.data.trxcall.trxClientToken)
// 	// 	if(data)
// 	// 		console.log('data', data)
// 	// return data;
// 	const doctorToken = data.data.token;
// 	return setDoctorToken(doctorToken, request, '/doctor/dashboard');
// }
export default function DoctorDashboard() {
	const navigate = useNavigate();
	const submit = useSubmit();
	const {data} = useLoaderData<typeof loader>();
	let doctor = (data) ? data.doctor : null;
	let geolocation = (data && data.trxGeoLocation) ? JSON.parse(data.trxGeoLocation) : null;
	let geolocationUrl = (geolocation && geolocation.latitude != 0) ? `https://www.google.com/maps/@${geolocation.latitude},${geolocation.longitude},21z?hl=id` : null;
	let room = (doctor) ? doctor.room : null;
	let pasienName = (data) ? data.pasienName : null
	
	const revalidator = useRevalidator();
	let intervalID: any = null;
	
	useEffect(() => {
		
		// if(!room) {
			intervalID = setInterval(() => {
				console.log('dataxxx', data)
				console.log('roomxxx', room)
				if (revalidator.state === "idle") {
					revalidator.revalidate();
				}
			}, 1000)
		// }
		// 	revalidator.revalidate();
		return () => clearInterval(intervalID);
	}, [revalidator]);
	return (
		<div className="grid h-full gap-4 place-content-center">
			
			<h1 className="text-3xl font-bold">Welcome {(doctor) ? doctor.name : '' }
				{/* <a href='#' className='text-danger' onClick={logOut}>keluar</a> */}
			</h1>
			
			{doctor && doctor.room ? (
				<div>
					<p>Pasien <b>{pasienName}</b> menghubungi anda. 
					{geolocationUrl ? (
						<a href={geolocationUrl} target='_blank' className='txt-link'>(Lihat Lokasi)</a>
					) : ''}</p>
					<br />
					
					<div className='flex items-end gap-4'>
						<Form
							action="/doctor/join"
							method="post"
						>
							<Button className="text-xs" type='submit'>Terima</Button>
						</Form>
						<Form
							action="/doctor/denied"
							method="post"
						>
							<Button className="text-xs bg-danger" type='submit'>Tolak</Button>
						</Form>
					</div>
				</div>
			) : ('Belum ada pasien yang menghubungi.')}
			<br />
			<br />
			<div>
			<Form
				action="/doctor/logout"
				method="post"
			>
				<Button className="text-xs bg-danger" type='submit'>Logout</Button>
			</Form>
			</div>
		</div>
	)
}
