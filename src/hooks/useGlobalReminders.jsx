import { useEffect, useRef } from "react";
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";

const useGlobalReminders = () => {
    const { user } = useAuthContext();
    const allRemindersRef = useRef([]);
    const shownToastsRef = useRef(new Set());

    useEffect(() => {
        if (!user?.uid) return;

        const checkDueReminders = () => {
            const now = new Date();
            const due = allRemindersRef.current.filter((r) => {
                const dueAt = r.dueAt?.toDate?.() || new Date(r.dueAt);
                const isDue = dueAt <= now;
                const isNotRead = !r.isRead;
                const notShown = !shownToastsRef.current.has(r.id);
                return isDue && isNotRead && notShown;
            });

            due.forEach((r) => {
                const toastId = `reminder-${r.id}`;
                shownToastsRef.current.add(r.id);
                const when = r.dueAt?.toDate ? r.dueAt.toDate() : new Date(r.dueAt);
                const timeLabel = isNaN(when.getTime())
                    ? ""
                    : when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                toast.custom(
                    (t) => (
                        <div
                            className={`
                pointer-events-auto w-72 max-w-xs transform transition-all duration-300
                ${t.visible ? "translate-x-0 opacity-100" : "translate-x-3 opacity-0"}
              `}
                        >
                            <div className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-xl p-[2px] shadow-lg">
                                <div className="bg-white dark:!bg-[#1e1e2d] rounded-xl px-4 py-3 flex items-center gap-3">
                                    <div className="flex-1 min-w-0 max-h-16 overflow-y-auto">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <div className="text-[11px] font-semibold text-indigo-600 dark:!text-indigo-400 tracking-wide uppercase">
                                                Reminder
                                            </div>
                                            {timeLabel && (
                                                <div className="ml-2 text-[10px] text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                                                    {timeLabel}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-xs font-medium text-gray-900 dark:!text-white break-words leading-snug">
                                            {r.title || "Untitled reminder"}
                                        </div>
                                        {r.description && (
                                            <div className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5 break-words leading-snug">
                                                {r.description}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                await deleteDoc(doc(db, "reminders", r.id));
                                                shownToastsRef.current.delete(r.id);
                                            } catch (e) {
                                                console.error("Failed to delete reminder", e);
                                            }
                                            toast.dismiss(toastId);
                                        }}
                                        className="shrink-0 ml-1 text-gray-400 hover:text-red-500 transition-colors"
                                        aria-label="Dismiss reminder"
                                    >
                                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                            <path
                                                fillRule="evenodd"
                                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ),
                    {
                        id: toastId,
                        duration: Infinity,
                        position: "top-right",
                    }
                );
            });
        };

        const q = query(
            collection(db, "reminders"),
            where("userId", "==", user.uid),
            where("status", "==", "pending")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            allRemindersRef.current = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            checkDueReminders();
        });

        const intervalId = setInterval(checkDueReminders, 10000);

        return () => {
            unsubscribe();
            clearInterval(intervalId);
        };
    }, [user]);
};

export default useGlobalReminders;
