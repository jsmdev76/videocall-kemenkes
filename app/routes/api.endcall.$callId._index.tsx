import { redirect, type ActionFunctionArgs } from "@remix-run/cloudflare";
import invariant from "tiny-invariant";
import getClientToken, { removeClientToken } from "~/utils/getClientToken.server";
import getDoctorToken, { removeDoctorToken } from "~/utils/getDoctorToken.server";
import getUsername, { setUsername } from "~/utils/getUsername.server";

export const action = async ({
	params,
	request,
	context
  }: ActionFunctionArgs) => {
	const host = context.URL_API;
    console.log(params)
	let trxClientToken = await getClientToken(request);
	let doctorToken = await getDoctorToken(request);
	console.log('trxClientToken', trxClientToken);
	console.log('doctorToken', doctorToken);
	// if(!trxClientToken) {
	// 	if(doctorToken)
	// 		throw redirect('/doctor');
	// 	else
	// 		throw redirect('/set-username');
	// }

	let action = "end"
	if (doctorToken) {
		action = "agentLeft"
	} else if (trxClientToken) {
		action = "clientLeft"
	} else {
		action = "end"
	}
	const response = await fetch(`${host}/call/action`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': context.API_SECRET_KEY as string
		},
		body: JSON.stringify({
			action,
			roomId: params.callId
		})
	})
	let data:any = await response.json();
	console.log('data', data)
	// return data;
	if(!data.success) {
		throw new Response(data.message, {status: 500});
	}
	// clear session
	let url = '/end-room';
	// if(doctorToken)
	// 	url = '/doctor/dashboard';
	console.log('url', url);
	// return url;
	if (doctorToken) {
		return removeDoctorToken(request, url)
	} else {
		return removeClientToken(request, url);
	}
  };