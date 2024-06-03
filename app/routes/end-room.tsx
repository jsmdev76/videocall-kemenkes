import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs, json } from '@remix-run/cloudflare'
import { Form, Link, useFetcher, useLoaderData, useSubmit } from '@remix-run/react'
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

export default function EndRoom() {
	return (
		<div className="grid h-full gap-4 place-content-center bg-login">
			<div className="bg-kemenkes box-logo"></div>
			<h1 className="text-3xl font-bold text-blue">Sesi konseling berakhir</h1>
			<p className='text-blue'>Kami harap kamu sudah merasa terbantu setelah sesi ini. Kamu bisa menghubungi konselor kami melalui WhatsApp jika membutuhkan bantuan lebih lanjut.</p>
			<a href="https://wa.me/1XXXXXXXXXX" target='_blank' className='btn-link bg-blue'><i className="fa fa-whatsapp"></i> Hubungi via WhatsApp</a>
			<Link to="/set-username"> &larr; Kembali ke beranda</Link>
		</div>
	)
}
