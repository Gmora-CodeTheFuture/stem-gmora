import { ImgHTMLAttributes } from 'react';

export default function ApplicationLogo(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <>
            <img {...props} src="/logo.png" alt="Gmora STEM Logo" className={`${props.className || ''} dark:hidden block object-contain`} />
            <img {...props} src="/logo-dark.png" alt="Gmora STEM Logo" className={`${props.className || ''} hidden dark:block object-contain`} />
        </>
    );
}
