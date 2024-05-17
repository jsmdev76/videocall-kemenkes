import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs, json } from '@remix-run/cloudflare'
import { Form, Link, useFetcher, useLoaderData, useNavigate, useSubmit } from '@remix-run/react'
import { useEffect } from 'react'
import invariant from 'tiny-invariant'
import { Button } from '~/components/Button'
import { Input } from '~/components/Input'
import { ACCESS_AUTHENTICATED_USER_EMAIL_HEADER } from '~/utils/constants'
import getDoctorToken, { setDoctorToken } from '~/utils/getDoctorToken.server'
import { setUsername } from '~/utils/getUsername.server'
// import DataApi from '~/api/dataApi.server'
export const loader = async({request}: LoaderFunctionArgs) => {
	const host = 'http://localhost:3000';
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
	let data = await response.json();
	console.log('data', data)
	// return data;
	if(!data.success) {
		throw redirect('/doctor?msg='+data.message);
	}
	data = data.data
	return json({data});
}
// export const action = async ({ request }: ActionFunctionArgs) => {
// 	const host = 'http://localhost:3000';
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
// 	const data = await response.json();
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
	let doctor = data.doctor
	let room = doctor.room
	
	let intervalID: any = null;
	useEffect(() => {
		console.log('room', room)
		if(!room) {
			intervalID = setInterval(() => {
				navigate(`/doctor/dashboard`);
			}, 3000);
		}
	// console.log('doctorIdle', doctorIdle) 
		return () => clearInterval(intervalID);
		
	}, [room]);
	return (
		<div className="grid h-full gap-4 place-content-center">
			
			<h1 className="text-3xl font-bold">Welcome {doctor.name}
				{/* <a href='#' className='text-danger' onClick={logOut}>keluar</a> */}
			</h1>
			{doctor.room ? (
				<div className='flex items-end gap-4'>
					<Form
						action="/doctor/join"
						method="post"
					>
						<Button className="text-xs" type='submit'>Gabung Meet</Button>
					</Form>
					<Form
						action="denied"
						method="post"
					>
						<Button className="text-xs bg-danger" type='submit'>Tolak Meet</Button>
					</Form>
				</div>
			) : ('No Available Room')}
			<div>
			<Form
				action="/doctor/logout"
				method="post"
			>
				<Button className="text-xs bg-danger" type='submit'>Keluar</Button>
			</Form>
			</div>
		</div>
	)
}
