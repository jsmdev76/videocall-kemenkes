import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare'
import {
	Form,
	useActionData,
	useFetcher,
	useLoaderData,
	useNavigate,
	useRevalidator,
	useSearchParams,
	useSubmit,
} from '@remix-run/react'
import moment from 'moment'
import { useEffect } from 'react'
import { Button } from '~/components/Button'
import { setClientToken } from '~/utils/getClientToken.server'
import getDoctorToken, { setDoctorToken } from '~/utils/getDoctorToken.server'
import { playSound } from '~/utils/playSound'

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
	const host = context.URL_API
	const url = new URL(request.url)
	const username = url.searchParams.get('username')
	const id = url.searchParams.get('id')
	const role = url.searchParams.get('role')
	// let doctorToken = await getDoctorToken(request)

	// console.log('doctorToken', doctorToken)
	// if(!doctorToken) {
	// 	throw redirect('/doctor');
	// }
	// const response = await fetch(`${host}/doctor?username=${username}&id=${id}`, {
	// 	method: 'get',
	// 	// headers: {
	// 	// 	Authorization: 'Bearer ' + doctorToken,
	// 	// },
	// })
	// let data: any = await response.json()
	// if(!data.success) {
	// 	return removeDoctorToken(request, `/doctor`);
	// }
	// data = data.data
	// if (data.trxCallStatus == 1) {
	// 	return setClientToken(
	// 		request,
	// 		`/${data.doctor.room}/room`,
	// 		data.trxClientToken
	// 	)
	// }
	let now = moment(new Date()) //todays date
	// let end = data.trxWaitingDate ? data.trxWaitingDate : data.trxDate // another date
	// let duration = moment.duration(now.diff(end))
	// let seconds = Math.floor(duration.asSeconds())
	// let maxsecond = 30 - seconds
	const response = await fetch(`${host}/call/agent/${id}`, {
		method: "GET",
	})

	const data:{message: string; success:boolean; data:any} = await response.json()
	console.log("data",data)

	// if (data.success && username) {
	// 	return setDoctorToken("token",username, request,`/${data.data.room}/room`)
	// }

	return json({ username,id, data })
}

export default function DoctorDashboard() {
	const navigate = useNavigate()
	const submit = useSubmit()
	const {data: checkNewCall, username, id} = useLoaderData<typeof loader>()
	const actionData = useActionData()
	console.log(checkNewCall)
	// const { username,id, data: checkNewCall } = useLoaderData<typeof loader>()
	// console.log(username,id)
	// let doctor = data.doctor
	// let geolocation = data.trxGeoLocation ? JSON.parse(data.trxGeoLocation) : null
	// let geolocationUrl =  `https://www.google.com/maps/@${geolocation.latitude},${geolocation.longitude},21z?hl=id`
	// let room = doctor.room
	// let pasienName = data.pasienName
	// let trxCallStatus = data.trxCallStatus

	const revalidator = useRevalidator()
	let intervalID: any = null

	// useEffect(() => {
	// 	// if(!room) {
	// 	intervalID = setInterval(() => {
	// 		if (revalidator.state === 'idle') {
	// 			revalidator.revalidate()
	// 		}
	// 	}, 1000)
	// 	// }

	// 	if (room) {
	// 		playSound('raiseHand')
	// 	}
	// 	// 	revalidator.revalidate();

	// 	return () => clearInterval(intervalID)
	// }, [revalidator])

	// console.log(!!checkNewCall.data)

	if (!username) return <div><h1>Username not found</h1></div>

	return (
		<div className="grid h-full gap-4 place-content-center bg-doctor">
			<div className="grid grid-cols-2 gap-4">
				<div className="grid gap-2">
					<div className="bg-kemenkes box-logo"></div>
				</div>
				{/* <div className="grid gap-2">
					<Form action="/doctor/logout" method="post" className="text-right">
						<Button className="text-xs bg-danger link-logout" type="submit">
							Logout
						</Button>
					</Form>
				</div> */}
			</div>
			{checkNewCall.success ? (
				<div className="grid place-content-center doctor-incall-box text-center">
					<div className="call-icon"></div>
					<p className="mb-3">Panggilan masuk dari klien.</p>
					<p className="mb-3">
						<b>
							{checkNewCall.data.call.clientName} &nbsp;
							{/* {geolocationUrl ? (
								<a href={geolocationUrl} target="_blank" className="txt-link">
									(Lihat Lokasi)
								</a>
							) : (
								''
							)} */}
						</b>
					</p>
					<div className="loader-icon"></div>
					<div className="flex items-end gap-4 place-content-center">
						<Form action={`/doctor/denied?callId=${checkNewCall.data.call.id}&roomId=${checkNewCall.data.call.roomId}&username=${username}&id=${id}`} method="post" className="text-center">
							<Button className="text-xs bg-danger" type="submit">
								x
							</Button>
							<br />
							Tolak
						</Form>
						<Form action={`/doctor/join?callId=${checkNewCall.data.call.id}&roomId=${checkNewCall.data.call.roomId}`} method="post" className="text-center">
							<Button className="text-xs btn-w100 bg-green" type="submit">
								&#10003;
							</Button>
							<br />
							Terima
						</Form>
					</div>
				</div>
			) : (
				<div>
					<h1 className="text-3xl text-center font-bold text-blue">
						<small>Selamat datang,</small> <br /> {username}
					</h1>
					<div className="doctor-icon"></div>
					<div className="text-blue">
						Saat ini belum ada panggilan konsultasi dari klien.
					</div>
				</div>
			)}
			<br />
		</div>
	)
}
