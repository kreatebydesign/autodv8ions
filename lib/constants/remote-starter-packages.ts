export type RemoteStarterInstallPackage = {
  title: string;
  amount: string;
  imageSrc: string;
  imageAlt: string;
  features: readonly string[];
};

/** In-shop install packages — pricing retained from the live remote starters page. */
export const REMOTE_STARTER_INSTALL_PACKAGES: readonly RemoteStarterInstallPackage[] =
  [
    {
      title: "Basic Remote Start",
      amount: "$400",
      imageSrc: "/images/remote-starters/display/basic-remote-start.png",
      imageAlt: "1-way remote start key fob",
      features: [
        "1-way remote starter",
        "Up to 1,500 ft range",
        "Simple remote start operation",
      ],
    },
    {
      title: "2-Way LED Remote Start",
      amount: "$500",
      imageSrc: "/images/remote-starters/display/two-way-led-remote-start.png",
      imageAlt: "2-way LED remote start key fob",
      features: [
        "2-way LED remote starter",
        "Up to 1/2-mile range",
        "Remote confirmation when the command is received",
      ],
    },
  ];
