import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollProgress from "./ScrollProgress";
import BackToTop from "./BackToTop";
import VerifyEmailBanner from "./VerifyEmailBanner";

export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="sticky top-0 z-50 bg-white">
        <Navbar />
        <ScrollProgress />
      </div>
      <VerifyEmailBanner />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}
