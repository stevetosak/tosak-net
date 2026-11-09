// A CSS Module's default export maps each class in the file to its scoped name.
declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
