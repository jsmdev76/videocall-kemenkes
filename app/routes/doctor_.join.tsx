import { redirect, type ActionFunctionArgs } from "@remix-run/cloudflare";
import invariant from "tiny-invariant";
import getDoctorToken from "~/utils/getDoctorToken.server";
import { setUsername } from "~/utils/getUsername.server";

export const action = async ({
	params,
	request,
  }: ActionFunctionArgs) => {
	const host = 'https://e422-2001-448a-50e0-9999-7dd9-fc46-c819-36ca.ngrok-free.app';
	const url = new URL(request.url)
	let doctorToken = await getDoctorToken(request);
	console.log('doctorToken', doctorToken);
	if(!doctorToken) {
		throw redirect('/doctor');
	}
	const response = await fetch(`${host}/trxcall/accept`, {
		method: 'post',
		headers: {
			'Authorization': 'Bearer '+doctorToken
		}
	})
	let data = await response.json();
	console.log('data', data)
	// return data;
	if(!data.success) {
		throw redirect('/doctor?msg='+data.message);
	}
	data = data.data
	const doctor = data.doctor
	const trxcall = data.trxcall
	// return json({data});
    console.log('xxx',data)
	// return data
	return setUsername(doctor.name, trxcall.trxClientToken, request, `/${doctor.room}/room`);
  };