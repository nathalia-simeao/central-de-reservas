export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
    const hasRuntimeExtension = /\.(?:mjs|cjs|js|json|node)$/i.test(specifier);

    if (error?.code === "ERR_MODULE_NOT_FOUND" && isRelative && !hasRuntimeExtension) {
      return nextResolve(`${specifier}.js`, context);
    }

    throw error;
  }
}
