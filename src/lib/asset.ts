/** Prefix a /public path with the deployment basePath (plain <img>/<video> don't do it). */
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${path}`;
