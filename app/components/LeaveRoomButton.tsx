import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useNavigate, useSubmit } from '@remix-run/react'
import type { FC } from 'react'
import { Button } from './Button'
import { Icon } from './Icon/Icon'
import { Tooltip } from './Tooltip'

interface LeaveRoomButtonProps {}

export const LeaveRoomButton: FC<LeaveRoomButtonProps> = () => {
	const navigate = useNavigate()
	const submit = useSubmit()
	return (
		<Tooltip content="Leave">
			<Button
				displayType="danger"
				onClick={() => {
					// navigate('/set-username')
					submit({}, { method: "post", action: "/leaveroom" });
				}}
			>
				<VisuallyHidden>Leave</VisuallyHidden>
				<Icon type="phoneXMark" />
			</Button>
		</Tooltip>
	)
}
