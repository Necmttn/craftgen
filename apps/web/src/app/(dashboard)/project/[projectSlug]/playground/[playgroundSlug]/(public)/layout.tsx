import { getPlayground } from "../action";
import { ModuleHeader } from "../components/module-header";

const PlaygroundLayout = async (props: {
  params: {
    projectSlug: string;
    playgroundSlug: string;
  };
  children: React.ReactNode;
}) => {
  // TODO: make amount we fetch configurable
  const playground = await getPlayground({
    projectSlug: props.params.projectSlug,
    playgroundSlug: props.params.playgroundSlug,
  });
  if (!playground) return <div>Not found</div>;
  return (
    <div className="max-w-7xl mx-auto py-2 sm:py-5 px-4">
      <ModuleHeader playground={playground} />
      {props.children}
    </div>
  );
};

export default PlaygroundLayout;
