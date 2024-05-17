import { redirect, type ActionFunctionArgs } from "@remix-run/cloudflare";
import invariant from "tiny-invariant";
import getDoctorToken from "~/utils/getDoctorToken.server";
import { setUsername } from "~/utils/getUsername.server";

export const action = async ({
	params,
	request,
	context
  }: ActionFunctionArgs) => {
	const host = context.URL_API;
	const url = new URL(request.url)
	let doctorToken = await getDoctorToken(request);
	console.log('doctorToken', doctorToken);
	if(!doctorToken) {
		throw redirect('/doctor');
	}
	const response = await fetch(`${host}/trxcall/denied`, {
		method: 'post',
		headers: {
			'Authorization': 'Bearer '+doctorToken
		}
	})
	let data = await response.json();
	console.log('data', data)
	// return data;
	if(!data.success) {
		throw redirect('/doctor/dashboard?msg='+data.message);
	}
	
	// return data
	return redirect('/doctor/dashboard');
  };