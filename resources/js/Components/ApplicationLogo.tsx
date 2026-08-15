import { ImgHTMLAttributes } from 'react';

export default function ApplicationLogo(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <>
            <img {...props} src="/logo.svg" alt="Gmora STEM Logo" className={`${props.className || ''} dark:hidden block`} />
            <img {...props} src="/logo-dark.svg" alt="Gmora STEM Logo" className={`${props.className || ''} hidden dark:block`} />
        </>
    );
}
