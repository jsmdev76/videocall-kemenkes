import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useNavigate, useSubmit } from '@remix-run/react'
import type { FC } from 'react'
import { Button } from './Button'
import { Icon } from './Icon/Icon'
import { Tooltip } from './Tooltip'

interface LeaveRoomButtonProps {
	endpoint: string
}

export const LeaveRoomButton: FC<LeaveRoomButtonProps> = ({endpoint}) => {
	const navigate = useNavigate()
	const submit = useSubmit()
	return (
		<Tooltip content="Leave">
			<Button
				displayType="danger"
				className='btn-leave'
				onClick={() => {
					// navigate('/set-username')
					submit({}, { method: "post", action: endpoint });
				}}
			>
				<VisuallyHidden>Leave</VisuallyHidden>
				<Icon type="phoneXMark" />
			</Button>
		</Tooltip>
	)
}
