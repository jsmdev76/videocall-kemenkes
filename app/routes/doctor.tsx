import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs, json } from '@remix-run/cloudflare'
import { Form, useFetcher, useLoaderData, useSubmit } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { Button } from '~/components/Button'
import { Input } from '~/components/Input'
import { ACCESS_AUTHENTICATED_USER_EMAIL_HEADER } from '~/utils/constants'
import getDoctorToken, { setDoctorToken } from '~/utils/getDoctorToken.server'
import { setUsername } from '~/utils/getUsername.server'
// import DataApi from '~/api/dataApi.server'
export const loader = async({request}: LoaderFunctionArgs) => {
	const url = new URL(request.url)
	let msg = url.searchParams.get('msg')
	let doctorToken = await getDoctorToken(request);
	console.log('doctorToken', doctorToken);
	if(doctorToken) {
		throw redirect('/doctor/dashboard');
	}
	return json({msg});
}
export const action = async ({ request, context }: ActionFunctionArgs) => {
	const host = context.URL_API;
	console.log('host', host)
	const { username, password } = Object.fromEntries(await request.formData())
	invariant(typeof username === 'string')
	invariant(typeof password === 'string')
	const response = await fetch(`${host}/login`, {
		method: 'post',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			username: username,
			password: password,
		})
	})
	const data:any = await response.json();
	if(!data.success) {
		throw redirect('/doctor?msg='+data.message);
	}
	// if(data)
		// console.log('data', data.data.trxcall.trxClientToken)
	// 	if(data)
			console.log('data', data)
	// return data;
	const doctorToken = data.data.token;
	const doctor = data.data.doctor;
	return setDoctorToken(doctorToken, doctor.name, request, '/doctor/dashboard');
}

export default function Doctor() {
	const {msg} = useLoaderData<typeof loader>();
	return (
		<div className="grid h-full gap-4 place-content-center bg-login">
			<div className="bg-kemenkes box-logo"></div>
			<h1 className="text-3xl font-bold text-blue">Login konselor healing119.id</h1>
			<p className='text-blue'>Halo, Konselor hebat!
			<br />
			Terima kasih atas dedikasi Anda untuk melayani masyarakat.  
			Silakan login untuk mulai menerima panggilan konsultasi dari klien.</p>
			<Form className="w-60 items-end gap-4" method="post">
				<div className="grid gap-3">
					<Input
						autoComplete="off"
						autoFocus
						required
						type="text"
						id="username"
						name="username"
						placeholder='Username'
						className='mb-1.5'
					/>
				</div>
				<div className="grid gap-3">
					<Input
						autoComplete="off"
						autoFocus
						required
						type="password"
						id="password"
						name="password"
						placeholder='Password'
						className='mb-1.5'
					/>
				</div>
				<Button className="text-xs" type="submit">
					Login
				</Button>
			</Form>
			{msg != '' ? (
				<div className="text-danger">{msg}</div>
			) : ('')}
		</div>
	)
}
