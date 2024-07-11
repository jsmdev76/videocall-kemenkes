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
	// const response = await fetch(`${host}/call/action`, {
	// 	method: 'post',
	// 	headers: {
	// 		'Content-Type': 'application/json'
	// 	},
	// 	body: JSON.stringify({
	// 		action: "end",
	// 		callId: ""
	// 	})
	// })
	// let data:any = await response.json();
	// console.log('data', data)
	// // return data;
	// if(!data.success) {
	// 	throw new Response(data.message, {status: 500});
	// }
	// clear session
	let url = '/end-room/client';
	// if(doctorToken)
	// 	url = '/doctor/dashboard';
	console.log('url', url);
	// return url;
	return removeClientToken(request, url);
  };