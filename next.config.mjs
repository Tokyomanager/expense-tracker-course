/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: isGitHubPages ? "/expense-tracker-course" : "",
  assetPrefix: isGitHubPages ? "/expense-tracker-course/" : "",
};

export default nextConfig;
