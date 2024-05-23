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
		<div className="grid h-full gap-4 place-content-center">
			<div className="bg-kemenkes box-logo"></div>
			<h1 className="text-3xl font-bold">
				<svg width="50px" height="50px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M7 8C7 5.23858 9.23858 3 12 3C14.7614 3 17 5.23858 17 8V11C17 13.7614 14.7614 16 12 16C9.23858 16 7 13.7614 7 11V8Z" stroke="#1C274C" strokeWidth="1.5"/>
					<path opacity="0.5" d="M11 8H13" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round"/>
					<path opacity="0.5" d="M10 11L14 11" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round"/>
					<path opacity="0.5" d="M20 10V11C20 15.4183 16.4183 19 12 19M4 10V11C4 15.4183 7.58172 19 12 19M12 19V22" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round"/>
				</svg>
				Doctor Meets</h1>
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
