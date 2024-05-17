import { redirect, type ActionFunctionArgs } from "@remix-run/cloudflare";
import invariant from "tiny-invariant";
import getClientToken, { removeClientToken } from "~/utils/getClientToken.server";
import getDoctorToken, { removeDoctorToken } from "~/utils/getDoctorToken.server";
import { setUsername } from "~/utils/getUsername.server";

export const action = async ({
	params,
	request,
  }: ActionFunctionArgs) => {
	const host = 'https://e422-2001-448a-50e0-9999-7dd9-fc46-c819-36ca.ngrok-free.app';
	let trxClientToken = await getClientToken(request);
	let doctorToken = await getDoctorToken(request);
	console.log('trxClientToken', trxClientToken);
	console.log('doctorToken', doctorToken);
	if(!trxClientToken) {
		if(doctorToken)
			throw redirect('/doctor');
		else
			throw redirect('/set-username');
	}
	const response = await fetch(`${host}/trxcall/leave`, {
		method: 'post',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			trxClientToken: trxClientToken,
		})
	})
	let data = await response.json();
	console.log('data', data)
	// return data;
	if(!data.success) {
		throw new Response(data.message, {status: 500});
	}
	// clear session
	let url = '/set-username';
	if(doctorToken)
		url = '/doctor/dashboard';
	console.log('url', url);
	// return url;
	return removeClientToken(request, url);
  };