import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs, json } from '@remix-run/cloudflare'
import { Form, Link, useFetcher, useLoaderData, useNavigate, useRevalidator, useSubmit } from '@remix-run/react'
import moment from 'moment'
import { useEffect, useState } from 'react'
import { useInterval } from 'react-use'
import invariant from 'tiny-invariant'
import { Button } from '~/components/Button'
import { Input } from '~/components/Input'
import { ACCESS_AUTHENTICATED_USER_EMAIL_HEADER } from '~/utils/constants'
import { setClientToken } from '~/utils/getClientToken.server'
import getDoctorToken, { removeDoctorToken, setDoctorToken } from '~/utils/getDoctorToken.server'
import { setUsername } from '~/utils/getUsername.server'
import { playSound } from '~/utils/playSound'

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
	if(!data.success) {
		return removeDoctorToken(request, `/doctor`);
	}
	data = data.data
	if(data.trxCallStatus == 1) {
		return setClientToken(request, `/${data.doctor.room}/room`, data.trxClientToken);
	}
	let now = moment(new Date()); //todays date
	let end = (data.trxWaitingDate) ? data.trxWaitingDate : data.trxDate; // another date
	let duration = moment.duration(now.diff(end));
	let seconds = Math.floor(duration.asSeconds());
	let maxsecond = 30 - seconds;

	return json({data, seconds, maxsecond});
}

export default function DoctorDashboard() {
	const navigate = useNavigate();
	const submit = useSubmit();
	const {data, seconds, maxsecond} = useLoaderData<typeof loader>();
	let doctor = data.doctor
	let geolocation = (data.trxGeoLocation) ? JSON.parse(data.trxGeoLocation) : null;
	let geolocationUrl = (geolocation && geolocation.latitude != 0) ? `https://www.google.com/maps/@${geolocation.latitude},${geolocation.longitude},21z?hl=id` : null;
	let room = doctor.room
	let pasienName = data.pasienName
	let trxCallStatus = data.trxCallStatus
	
	const revalidator = useRevalidator();
	let intervalID: any = null;

	
	// useEffect(() => {
		
	// 	// if(!room) {
	// 		intervalID = setInterval(() => {
	// 			if (revalidator.state === "idle") {
	// 				revalidator.revalidate();
	// 			}
	// 		}, 1000)
	// 	// }
		
	// 	if(room) {
	// 		playSound('raiseHand');
	// 	}
	// 	// 	revalidator.revalidate();

		
	// 	return () => clearInterval(intervalID);
	// }, [revalidator]);

	useEffect(() => {
		const ws = new WebSocket(`ws://${window.location.host}/dashboard`);
		console.log(ws)
		
		ws.onmessage = (event) => {
			console.log(event)
		  const newData = JSON.parse(event.data);
		//   setCallData(newData);
		  if (newData.doctor.room) {
			playSound('raiseHand');
		  }
		};
		
		ws.onclose = () => {
		  console.log('WebSocket connection closed. Attempting to reconnect...');
		};
		
		return () => {
		  ws.close();
		};
	  }, []);
	  
	
	return (
		<div className="grid h-full gap-4 place-content-center bg-doctor">
			<div className='grid grid-cols-2 gap-4'>
				<div className='grid gap-2'>
					<div className="bg-kemenkes box-logo"></div>
				</div>
				<div className='grid gap-2'>
					<Form
						action="/doctor/logout"
						method="post"
						className='text-right'
					>
						<Button className="text-xs bg-danger link-logout" type='submit'>Logout</Button>
					</Form>
				</div>
			</div>
			{doctor.room ? (
				<div className='grid place-content-center doctor-incall-box text-center'>
					<div className="call-icon"></div>
					<p className='mb-3'>Panggilan masuk dari klien.</p>
					<p className='mb-3'><b>{pasienName} &nbsp;
					{geolocationUrl ? (
						<a href={geolocationUrl} target='_blank' className='txt-link'>(Lihat Lokasi)</a>
					) : ''}
					</b>
					{/* <br /> */}
					{/* ({maxsecond} detik) */}
					</p>
					<div className="loader-icon"></div>
					<div className='flex items-end gap-4 place-content-center'>
						<Form
							action="/doctor/denied"
							method="post"
							className='text-center'
						>
							<Button className="text-xs bg-danger" type='submit'>x</Button>
							<br />
							Tolak
						</Form>
						<Form
							action="/doctor/join"
							method="post"
							className='text-center'
						>
							<Button className="text-xs btn-w100 bg-green" type='submit'>&#10003;</Button>
							<br />
							Terima
						</Form>
					</div>
				</div>
			) : (
			<div>
				<h1 className="text-3xl text-center font-bold text-blue"><small>Selamat datang,</small> <br /> {doctor.name}</h1>
				<div className="doctor-icon"></div>
				<div className='text-blue'>Saat ini belum ada panggilan konsultasi dari klien.</div>
			</div>)}
			<br />
		</div>
	)
}
