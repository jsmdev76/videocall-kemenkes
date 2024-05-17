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
export const action = async ({ request }: ActionFunctionArgs) => {
	const host = 'https://e422-2001-448a-50e0-9999-7dd9-fc46-c819-36ca.ngrok-free.app';
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
	const data = await response.json();
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
		<div className="grid h-full gap-4 place-content-center">
			
			<h1 className="text-3xl font-bold">🍊 Doctor Meets</h1>
			<Form className="flex items-end gap-4" method="post">
				<div className="grid gap-3">
					<label htmlFor="username">Enter username</label>
					<Input
						autoComplete="off"
						autoFocus
						required
						type="text"
						id="username"
						name="username"
					/>
				</div>
				<div className="grid gap-3">
					<label htmlFor="password">Enter password</label>
					<Input
						autoComplete="off"
						autoFocus
						required
						type="password"
						id="password"
						name="password"
					/>
				</div>
				<Button className="text-xs" type="submit">
					Submit
				</Button>
			</Form>
			{msg != '' ? (
				<div className="text-danger">{msg}</div>
			) : ('')}
		</div>
	)
}
