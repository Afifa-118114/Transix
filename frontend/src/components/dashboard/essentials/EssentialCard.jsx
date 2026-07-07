import { FaHospital, FaGasPump, FaTrain, FaShieldAlt } from "react-icons/fa";

import { FaMoneyBill } from "react-icons/fa6";
import { IoMedical } from "react-icons/io5";
import { FiMapPin } from "react-icons/fi";

const icons = {
  hospital: <FaHospital />,
  atm: <FaMoneyBill />,
  fuel: <FaGasPump />,
  pharmacy: <IoMedical />,
  police: <FaShieldAlt />,
  metro: <FaTrain />,
};

function EssentialCard({ item }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      {/* Icon */}
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-2xl text-indigo-600 translate-x-1">
        {icons[item.icon]}
      </div>

      {/* Details */}
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 -translate-x-1">
          {item.title}
        </h3>

        <p className="text-xs font-semibold text-gray-500 -translate-x-1">
          {item.nearest}
        </p>

        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 -translate-x-1">
          <FiMapPin className="text-indigo-500" />
          {item.distance ? `${item.distance} away` : ""}
        </div>
      </div>
    </div>
  );
}

export default EssentialCard;
