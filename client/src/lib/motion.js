// Shared animation variants for scroll-triggered motion across the site.
// Usage: <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

// Wrap a group of fadeUp children in this to make them reveal one after
// another instead of all at once.
export const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12 },
  },
};
